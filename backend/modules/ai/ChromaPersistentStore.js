/**
 * ChromaPersistentStore.js
 *
 * Week 8 Day 4: CIA Memory Layer — ChromaDB Persistent Intern Profile
 *
 * Disk-backed persistent ChromaDB vector collection store (`backend/data/chromadb_store.json`).
 * Features:
 * - Persists multiple named collections (`cynaris_internship_roles`, `cynaris_intern_profiles`,
 *   `candidate_*_skill_gaps`) with 384-dim sentence-transformers embeddings, documents, and metadata.
 * - Atomic file writes (temp file + rename) so vector memory survives server restarts.
 * - Exact cosine similarity nearest-neighbor query across any collection.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_STORE_PATH = path.resolve(__dirname, '../../data/chromadb_store.json');

class ChromaPersistentStore {
  constructor(storePath = DEFAULT_STORE_PATH) {
    this.storePath = storePath;
    this.collections = {};
    this._loadFromDisk();
  }

  _loadFromDisk() {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.collections === 'object') {
          this.collections = parsed.collections;
        }
      }
    } catch {
      this.collections = {};
    }
  }

  _saveToDisk() {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const payload = JSON.stringify(
      {
        version: '1.0.0',
        embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2 (384-dim)',
        updatedAt: new Date().toISOString(),
        collections: this.collections,
      },
      null,
      2
    );
    const tmpPath = `${this.storePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, payload, 'utf8');
    fs.renameSync(tmpPath, this.storePath);
  }

  getOrCreateCollection(name, metadata = {}) {
    if (!this.collections[name]) {
      this.collections[name] = {
        name,
        metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: {},
      };
      this._saveToDisk();
    }
    return this.collections[name];
  }

  upsert(collectionName, id, { embedding, document, metadata = {} }) {
    const col = this.getOrCreateCollection(collectionName);
    const strId = String(id);
    const existing = col.items[strId];

    col.items[strId] = {
      id: strId,
      embedding,
      document,
      metadata: {
        ...(existing ? existing.metadata : {}),
        ...metadata,
        updated_at: new Date().toISOString(),
      },
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    col.updatedAt = new Date().toISOString();
    this._saveToDisk();
    return col.items[strId];
  }

  get(collectionName, id) {
    const col = this.collections[collectionName];
    if (!col) return null;
    return col.items[String(id)] || null;
  }

  getAll(collectionName) {
    const col = this.collections[collectionName];
    if (!col) return [];
    return Object.values(col.items);
  }

  count(collectionName) {
    return this.getAll(collectionName).length;
  }

  query(collectionName, queryEmbedding, nResults = 5, computeSimilarityFn = null) {
    const items = this.getAll(collectionName);
    const simFn =
      computeSimilarityFn ||
      ((a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
        let dot = 0;
        let na = 0;
        let nb = 0;
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          na += a[i] * a[i];
          nb += b[i] * b[i];
        }
        const denom = Math.sqrt(na) * Math.sqrt(nb);
        return denom === 0 ? 0 : Math.max(-1, Math.min(1, dot / denom));
      });

    return items
      .map((item) => ({
        ...item,
        similarity: Math.round(simFn(queryEmbedding, item.embedding) * 1000) / 1000,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, nResults);
  }
}

const chromaPersistentStore = new ChromaPersistentStore();

module.exports = {
  ChromaPersistentStore,
  chromaPersistentStore,
  DEFAULT_STORE_PATH,
};
