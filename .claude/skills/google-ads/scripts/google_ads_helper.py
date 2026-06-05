#!/usr/bin/env python3
"""Small Google Ads API helper for Omni's google-ads skill.

Uses only Python stdlib so it can run in minimal agent workspaces.

Commands:
  check-env
  list-customers
  customer-summary --customer-id CUSTOMER_ID
  search --customer-id CUSTOMER_ID --query GAQL
  probe-access-level --customer-id CUSTOMER_ID
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

API_VERSION = "v24"
REQUIRED_ENV = (
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN",
    "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
)


class GoogleAdsApiError(RuntimeError):
    """Raised when Google Ads API returns a non-2xx response."""

    def __init__(self, status: int, body: str):
        super().__init__(f"Google Ads API error {status}: {body}")
        self.status = status
        self.body = body


def _normalize_customer_id(customer_id: str) -> str:
    return customer_id.replace("-", "").strip()


def _require_env() -> dict[str, str]:
    missing = [name for name in REQUIRED_ENV if not os.environ.get(name)]
    if missing:
        raise SystemExit(
            "Missing required Google Ads env vars: " + ", ".join(missing)
        )
    return {name: os.environ[name] for name in REQUIRED_ENV}


def _post_json(url: str, headers: dict[str, str], payload: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise GoogleAdsApiError(exc.code, body) from exc


def _get_json(url: str, headers: dict[str, str]) -> dict[str, Any]:
    request = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise GoogleAdsApiError(exc.code, body) from exc


def _access_token(env: dict[str, str]) -> str:
    body = urllib.parse.urlencode(
        {
            "client_id": env["GOOGLE_ADS_CLIENT_ID"],
            "client_secret": env["GOOGLE_ADS_CLIENT_SECRET"],
            "refresh_token": env["GOOGLE_ADS_REFRESH_TOKEN"],
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise GoogleAdsApiError(exc.code, body_text) from exc

    token = data.get("access_token")
    if not token:
        raise RuntimeError("OAuth response did not include access_token")
    return token


def _headers(env: dict[str, str], token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "developer-token": env["GOOGLE_ADS_DEVELOPER_TOKEN"],
        "login-customer-id": _normalize_customer_id(env["GOOGLE_ADS_LOGIN_CUSTOMER_ID"]),
        "Content-Type": "application/json",
    }


def check_env(_: argparse.Namespace) -> None:
    status = {
        name: "configured" if os.environ.get(name) else "missing"
        for name in REQUIRED_ENV
    }
    print(json.dumps(status, indent=2))
    if any(value == "missing" for value in status.values()):
        raise SystemExit(1)


def list_customers(_: argparse.Namespace) -> None:
    env = _require_env()
    token = _access_token(env)
    url = f"https://googleads.googleapis.com/{API_VERSION}/customers:listAccessibleCustomers"
    data = _get_json(url, _headers(env, token))
    print(json.dumps(data, indent=2, sort_keys=True))


def search(args: argparse.Namespace) -> None:
    env = _require_env()
    token = _access_token(env)
    customer_id = _normalize_customer_id(args.customer_id)
    url = f"https://googleads.googleapis.com/{API_VERSION}/customers/{customer_id}/googleAds:search"
    data = _post_json(
        url,
        _headers(env, token),
        {"query": args.query},
    )
    print(json.dumps(data, indent=2, sort_keys=True))


def customer_summary(args: argparse.Namespace) -> None:
    args.query = (
        "SELECT customer.id, customer.descriptive_name, "
        "customer.currency_code, customer.time_zone FROM customer LIMIT 1"
    )
    search(args)


def probe_access_level(args: argparse.Namespace) -> None:
    """Probe token level with one production GAQL call and one Basic-only endpoint."""
    env = _require_env()
    token = _access_token(env)
    headers = _headers(env, token)
    customer_id = _normalize_customer_id(args.customer_id)

    search_url = (
        f"https://googleads.googleapis.com/{API_VERSION}/customers/"
        f"{customer_id}/googleAds:search"
    )
    gaql_result = _post_json(
        search_url,
        headers,
            {
                "query": (
                    "SELECT customer.id, customer.descriptive_name, "
                    "customer.currency_code, customer.time_zone FROM customer LIMIT 1"
                ),
            },
        )

    keyword_url = (
        f"https://googleads.googleapis.com/{API_VERSION}/customers/"
        f"{customer_id}:generateKeywordIdeas"
    )
    probe: dict[str, Any] = {
        "api_version": API_VERSION,
        "production_gaql": "ok",
        "customer_summary": gaql_result.get("results", []),
    }
    try:
        _post_json(
            keyword_url,
            headers,
            {
                "language": "languageConstants/1000",
                "keywordPlanNetwork": "GOOGLE_SEARCH",
                "keywordSeed": {"keywords": ["digital provenance"]},
            },
        )
        probe["basic_only_keyword_ideas"] = "allowed"
        probe["inferred_access_level"] = "basic_or_standard"
    except GoogleAdsApiError as exc:
        probe["basic_only_keyword_ideas"] = {
            "status": exc.status,
            "body": _safe_error_summary(exc.body),
        }
        if "explorer access" in exc.body.lower():
            probe["inferred_access_level"] = "explorer"
        else:
            probe["inferred_access_level"] = "unknown"

    print(json.dumps(probe, indent=2, sort_keys=True))


def _safe_error_summary(body: str) -> str:
    """Return a compact API error body without credentials."""
    try:
        parsed = json.loads(body)
        return json.dumps(parsed, sort_keys=True)
    except json.JSONDecodeError:
        return body[:2000]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("check-env").set_defaults(func=check_env)
    sub.add_parser("list-customers").set_defaults(func=list_customers)

    summary_parser = sub.add_parser("customer-summary")
    summary_parser.add_argument("--customer-id", required=True)
    summary_parser.set_defaults(func=customer_summary)

    search_parser = sub.add_parser("search")
    search_parser.add_argument("--customer-id", required=True)
    search_parser.add_argument("--query", required=True)
    search_parser.add_argument(
        "--page-size",
        type=int,
        default=None,
        help="Accepted for backwards compatibility; Google Ads v24 search ignores it.",
    )
    search_parser.set_defaults(func=search)

    probe_parser = sub.add_parser("probe-access-level")
    probe_parser.add_argument("--customer-id", required=True)
    probe_parser.set_defaults(func=probe_access_level)

    args = parser.parse_args()
    try:
        args.func(args)
        return 0
    except GoogleAdsApiError as exc:
        print(
            json.dumps(
                {
                    "error": "google_ads_api_error",
                    "status": exc.status,
                    "body": _safe_error_summary(exc.body),
                },
                indent=2,
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
