import assert from "node:assert/strict";

/** Minimal localStorage/sessionStorage shim so the storage module runs in Node. */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

const local = new MemoryStorage();
const session = new MemoryStorage();
const g = globalThis as unknown as {
  window: unknown;
  localStorage: MemoryStorage;
  sessionStorage: MemoryStorage;
};
g.window = globalThis;
g.localStorage = local;
g.sessionStorage = session;

const { loadSettings, saveSettings, hasApiKey } = await import("../lib/storage");
const { DEFAULT_PROVIDER } = await import("../lib/providers");

// --- 1. Gemini is the default on a fresh install ---
const fresh = loadSettings();
assert.equal(fresh.provider, "gemini", "Gemini should be the default provider");
assert.equal(DEFAULT_PROVIDER, "gemini");
assert.equal(fresh.providers.gemini.apiEndpoint, "https://generativelanguage.googleapis.com/v1beta");
assert.equal(fresh.providers.gemini.model, "gemini-3.5-flash-lite");
assert.equal(fresh.providers.minimax.apiEndpoint, "https://api.minimax.io/v1");
assert.equal(fresh.providers.minimax.model, "MiniMax-M3");
assert.equal(hasApiKey(fresh), false, "No key should be set on a fresh install");

// --- 2. Each provider keeps its own key ---
saveSettings({
  ...fresh,
  provider: "gemini",
  providers: {
    ...fresh.providers,
    gemini: { ...fresh.providers.gemini, apiKey: "gemini-key" },
    minimax: { ...fresh.providers.minimax, apiKey: "minimax-key" },
  },
});
const saved = loadSettings();
assert.equal(saved.providers.gemini.apiKey, "gemini-key");
assert.equal(saved.providers.minimax.apiKey, "minimax-key");
assert.equal(hasApiKey(saved), true);

// --- 3. The provider selection survives a reload ---
const reloaded = loadSettings();
assert.equal(reloaded.provider, "gemini");
assert.equal(reloaded.providers.gemini.apiKey, "gemini-key");
assert.equal(reloaded.providers.minimax.apiKey, "minimax-key");

// --- 4. Switching provider keeps the other provider's key ---
saveSettings({ ...reloaded, provider: "minimax" });
const switched = loadSettings();
assert.equal(switched.provider, "minimax");
assert.equal(switched.providers.minimax.apiKey, "minimax-key");
assert.equal(switched.providers.gemini.apiKey, "gemini-key");

// --- 5. Ephemeral keys move to session storage ---
saveSettings({ ...switched, ephemeralKey: true });
const ephemeral = loadSettings();
assert.equal(ephemeral.providers.minimax.apiKey, "minimax-key");
assert.equal(local.getItem("apehealth.providers.keys"), null);
assert.ok(session.getItem("apehealth.providers.keys.session"));

// --- 6. Legacy MiniMax-only install migrates cleanly ---
local.clear();
session.clear();
local.setItem("apehealth.apiKey", "legacy-minimax-key");
local.setItem("apehealth.apiEndpoint", "https://api.minimax.io/v1");
local.setItem("apehealth.model", "MiniMax-M2.7");
const migrated = loadSettings();
assert.equal(migrated.providers.minimax.apiKey, "legacy-minimax-key");
assert.equal(migrated.providers.minimax.model, "MiniMax-M2.7");
assert.equal(migrated.providers.gemini.apiKey, "", "Gemini should start empty");
assert.equal(migrated.provider, "gemini", "Gemini should still be the default");

console.log("✅ All storage checks passed");
