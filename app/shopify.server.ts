import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

type ShopifyApp = ReturnType<typeof shopifyApp>;

const hasShopifyCredentials = Boolean(
  process.env.SHOPIFY_API_KEY?.trim() &&
    process.env.SHOPIFY_API_SECRET?.trim() &&
    process.env.SHOPIFY_APP_URL?.trim(),
);

// Live Shopify access is opt-in. The Vercel presentation preview therefore
// stays usable with mock data and cannot issue real store credit by default.
const liveShopifyEnabled =
  process.env.SHOPIFY_DEMO_MODE === "false" && hasShopifyCredentials;

const shopify: ShopifyApp | null = liveShopifyEnabled
  ? shopifyApp({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET!,
      apiVersion: ApiVersion.July26,
      scopes: process.env.SCOPES?.split(","),
      appUrl: process.env.SHOPIFY_APP_URL!,
      authPathPrefix: "/auth",
      sessionStorage: new PrismaSessionStorage(prisma),
      useOnlineTokens: true,
      distribution: AppDistribution.SingleMerchant,
      future: {
        expiringOfflineAccessTokens: true,
      },
      ...(process.env.SHOP_CUSTOM_DOMAIN
        ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
        : {}),
    })
  : null;

const demoModeError = () => {
  throw new Response("Shopify access is disabled in demo mode.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

const demoAuthenticate = new Proxy(
  {} as object,
  { get: () => demoModeError },
) as ShopifyApp["authenticate"];

export default shopify;
export const apiVersion = ApiVersion.July26;
export const addDocumentResponseHeaders: ShopifyApp["addDocumentResponseHeaders"] =
  shopify?.addDocumentResponseHeaders ?? (() => {});
export const authenticate = shopify?.authenticate ?? demoAuthenticate;
export const unauthenticated = shopify?.unauthenticated ?? demoAuthenticate;
export const login: ShopifyApp["login"] =
  shopify?.login ?? (demoModeError as ShopifyApp["login"]);
export const registerWebhooks: ShopifyApp["registerWebhooks"] =
  shopify?.registerWebhooks ?? (demoModeError as ShopifyApp["registerWebhooks"]);
export const sessionStorage: ShopifyApp["sessionStorage"] =
  shopify?.sessionStorage ??
  (new Proxy({}, { get: () => demoModeError }) as ShopifyApp["sessionStorage"]);
