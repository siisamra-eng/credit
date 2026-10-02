# Carbinox Credit

Carbinox Credit is a Shopify custom app concept for store credit rewards. The public home page is a presentation preview with sample data; its award-credit and rule controls only change the browser preview. Shopify Admin pages are authenticated.

## Current implementation

- Native Shopify store-credit credit/debit service with decimal-safe amounts and an audit ledger.
- Paid-order cashback webhook, based on eligible merchandise after discounts and before taxes. Gift cards are excluded.
- Refund webhook that calculates a proportional cashback reversal.
- Cashback is disabled until an `Order cashback` rule exists and is explicitly active. New rules default to paused.
- Shopify Admin controls are restricted to the store owner: activating a cashback rule requires confirmation, and manual credit/debit requires an approval checkbox plus a final confirmation of customer, amount, currency, and reason.
- Successful manual adjustments record the owner, reason, idempotency key, Shopify transaction, and resulting balance.

## Local development

Use Node.js 22.12 or newer and the Shopify CLI.

```sh
npm install
npm run dev
```

The CLI setup requires a Shopify custom app in the Partner Dashboard and a development store. `shopify.app.toml` intentionally has no client ID until the app is linked. Keep all Shopify credentials in environment variables; do not commit `.env` files.

To view the presentation preview without installing the app, configure `SHOPIFY_APP_URL`, `SHOPIFY_API_KEY`, and `SHOPIFY_API_SECRET` for the local server. The preview figures and names are illustrative only.

## Shopify configuration

The app targets the stable Admin API version `2026-07`, uses single-merchant distribution, and requests these scopes:

- `read_orders`
- `read_customers`
- `write_store_credit_account_transactions`
- `read_store_credit_account_transactions`
- `read_store_credit_accounts`

The configured webhooks are `orders/paid` and `refunds/create`. A merchant must approve requested access during installation. Store-credit scopes and customer data access may require Shopify approval.

## Production requirements

The app currently uses SQLite for local development; Vercel production needs a persistent PostgreSQL database for Shopify sessions and the credit ledger, plus production Shopify app credentials and an HTTPS app URL.

An actual store’s existing credit history cannot be inferred from this repository. Check the store’s Shopify store-credit transaction history to verify balances and prior credits.
