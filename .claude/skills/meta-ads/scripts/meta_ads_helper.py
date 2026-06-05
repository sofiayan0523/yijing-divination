#!/usr/bin/env python3
"""Small Meta Marketing API helper for Omni's meta-ads skill.

Uses only Python stdlib so it can run in minimal agent workspaces.

Commands:
  check-env
  debug-token
  list-ad-accounts
  account-summary
  list-campaigns [--limit N]
  insights [--date-preset PRESET] [--level LEVEL] [--limit N]
  probe-permissions
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

API_VERSION = "v25.0"
GRAPH_BASE = f"https://graph.facebook.com/{API_VERSION}"
REQUIRED_ENV = (
    "META_APP_ID",
    "META_ADS_ACCESS_TOKEN",
    "META_ADS_BUSINESS_ID",
    "META_ADS_AD_ACCOUNT_ID",
)


class MetaAdsApiError(RuntimeError):
    """Raised when Meta Marketing API returns a non-2xx response."""

    def __init__(self, status: int, body: str):
        super().__init__(f"Meta Marketing API error {status}: {body}")
        self.status = status
        self.body = body


def _require_env() -> dict[str, str]:
    missing = [name for name in REQUIRED_ENV if not os.environ.get(name)]
    if missing:
        raise SystemExit("Missing required Meta Ads env vars: " + ", ".join(missing))
    return {name: os.environ[name] for name in REQUIRED_ENV}


def _normalize_ad_account_id(ad_account_id: str) -> str:
    value = ad_account_id.strip()
    return value if value.startswith("act_") else f"act_{value}"


def _buc_usage(headers: Any) -> dict[str, Any] | None:
    raw = headers.get("X-Business-Use-Case-Usage")
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw": raw[:1000]}


def _get_json(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    env = _require_env()
    query = {"access_token": env["META_ADS_ACCESS_TOKEN"]}
    if params:
        query.update({key: value for key, value in params.items() if value is not None})
    url = f"{GRAPH_BASE}/{path.lstrip('/')}?{urllib.parse.urlencode(query)}"
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            body = json.loads(raw) if raw else {}
            return {"body": body, "buc_usage": _buc_usage(response.headers)}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise MetaAdsApiError(exc.code, body) from exc


def _safe_error_summary(body: str) -> str:
    """Return a compact API error body without credentials."""
    try:
        parsed = json.loads(body)
        return json.dumps(parsed, sort_keys=True)
    except json.JSONDecodeError:
        return body[:2000]


def _print_result(data: dict[str, Any]) -> None:
    print(json.dumps(data, indent=2, sort_keys=True))


def check_env(_: argparse.Namespace) -> None:
    status = {name: "configured" if os.environ.get(name) else "missing" for name in REQUIRED_ENV}
    print(json.dumps(status, indent=2))
    if any(value == "missing" for value in status.values()):
        raise SystemExit(1)


def debug_token(_: argparse.Namespace) -> None:
    env = _require_env()
    result = _get_json(
        "debug_token",
        {
            "input_token": env["META_ADS_ACCESS_TOKEN"],
            # System User tokens can introspect themselves for this helper's
            # purpose; avoid requiring an app secret in Space credentials.
            "access_token": env["META_ADS_ACCESS_TOKEN"],
        },
    )
    _print_result(result)


def list_ad_accounts(_: argparse.Namespace) -> None:
    env = _require_env()
    fields = "id,account_id,name,currency,timezone_name,account_status,amount_spent,balance"
    owned = _get_json(
        f"{env['META_ADS_BUSINESS_ID']}/owned_ad_accounts",
        {"fields": fields, "limit": 100},
    )
    client = _get_json(
        f"{env['META_ADS_BUSINESS_ID']}/client_ad_accounts",
        {"fields": fields, "limit": 100},
    )
    _print_result(
        {
            "business_id": env["META_ADS_BUSINESS_ID"],
            "owned_ad_accounts": owned.get("body", {}).get("data", []),
            "client_ad_accounts": client.get("body", {}).get("data", []),
            "buc_usage": owned.get("buc_usage") or client.get("buc_usage"),
        }
    )


def account_summary(_: argparse.Namespace) -> None:
    env = _require_env()
    ad_account_id = _normalize_ad_account_id(env["META_ADS_AD_ACCOUNT_ID"])
    result = _get_json(
        ad_account_id,
        {
            "fields": (
                "id,account_id,name,currency,timezone_name,account_status,"
                "amount_spent,balance,business"
            )
        },
    )
    _print_result(result)


def list_campaigns(args: argparse.Namespace) -> None:
    env = _require_env()
    ad_account_id = _normalize_ad_account_id(env["META_ADS_AD_ACCOUNT_ID"])
    result = _get_json(
        f"{ad_account_id}/campaigns",
        {
            "fields": "id,name,status,effective_status,objective,created_time,updated_time",
            "limit": args.limit,
        },
    )
    _print_result(result)


def insights(args: argparse.Namespace) -> None:
    env = _require_env()
    ad_account_id = _normalize_ad_account_id(env["META_ADS_AD_ACCOUNT_ID"])
    result = _get_json(
        f"{ad_account_id}/insights",
        {
            "fields": (
                "campaign_id,campaign_name,impressions,clicks,spend,actions,"
                "date_start,date_stop"
            ),
            "date_preset": args.date_preset,
            "level": args.level,
            "limit": args.limit,
        },
    )
    _print_result(result)


def probe_permissions(args: argparse.Namespace) -> None:
    env = _require_env()
    probe: dict[str, Any] = {
        "api_version": API_VERSION,
        "business_id": env["META_ADS_BUSINESS_ID"],
        "ad_account_id": _normalize_ad_account_id(env["META_ADS_AD_ACCOUNT_ID"]),
    }

    try:
        token_info = _get_json(
            "debug_token",
            {
                "input_token": env["META_ADS_ACCESS_TOKEN"],
                "access_token": env["META_ADS_ACCESS_TOKEN"],
            },
        )
        probe["debug_token"] = token_info.get("body", {}).get("data", {})
    except MetaAdsApiError as exc:
        probe["debug_token_error"] = {"status": exc.status, "body": _safe_error_summary(exc.body)}

    account = _get_json(
        probe["ad_account_id"],
        {"fields": "id,account_id,name,currency,timezone_name,account_status,business"},
    )
    campaigns = _get_json(
        f"{probe['ad_account_id']}/campaigns",
        {"fields": "id,name,status,effective_status", "limit": args.limit},
    )
    probe["account_summary"] = account.get("body")
    probe["campaign_count_sample"] = len(campaigns.get("body", {}).get("data", []))
    probe["campaign_sample"] = campaigns.get("body", {}).get("data", [])
    probe["buc_usage"] = account.get("buc_usage") or campaigns.get("buc_usage")
    _print_result(probe)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("check-env").set_defaults(func=check_env)
    sub.add_parser("debug-token").set_defaults(func=debug_token)
    sub.add_parser("list-ad-accounts").set_defaults(func=list_ad_accounts)
    sub.add_parser("account-summary").set_defaults(func=account_summary)

    campaigns_parser = sub.add_parser("list-campaigns")
    campaigns_parser.add_argument("--limit", type=int, default=25)
    campaigns_parser.set_defaults(func=list_campaigns)

    insights_parser = sub.add_parser("insights")
    insights_parser.add_argument("--date-preset", default="last_7d")
    insights_parser.add_argument("--level", default="campaign")
    insights_parser.add_argument("--limit", type=int, default=25)
    insights_parser.set_defaults(func=insights)

    probe_parser = sub.add_parser("probe-permissions")
    probe_parser.add_argument("--limit", type=int, default=5)
    probe_parser.set_defaults(func=probe_permissions)

    args = parser.parse_args()
    try:
        args.func(args)
        return 0
    except MetaAdsApiError as exc:
        print(
            json.dumps(
                {
                    "error": "meta_ads_api_error",
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
