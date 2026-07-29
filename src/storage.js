// Este archivo hace que la app guarde tus datos en el propio navegador del
// móvil (localStorage), imitando la misma API de almacenamiento que usaba
// dentro de Claude. Así el código de App.jsx no necesita casi ningún cambio.

const PREFIX = "lilis-crochet:";

function ensureStorage() {
  if (typeof window === "undefined") return;

  window.storage = {
    async get(key) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null) return null;
        return { key, value: raw, shared: false };
      } catch (e) {
        throw e;
      }
    },
    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      const existed = localStorage.getItem(PREFIX + key) !== null;
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: existed, shared: false };
    },
    async list(prefix = "") {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) keys.push(k.slice(PREFIX.length));
      }
      return { keys, prefix, shared: false };
    },
  };
}

ensureStorage();
