import { W as WorkflowEventProcessor, s as saveScorePayloadSchema } from './chunk-X2TVBX7O.mjs';
import { a as augmentWithInit } from './chunk-436FFEF6.mjs';
import { M as MastraBase, C as ConsoleLogger, L as LogLevel, s as setupAITracing, g as getAllAITracing, a as shutdownAITracingRegistry } from './ai-tracing.mjs';
import { g as getDefaultExportFromCjs } from './_commonjsHelpers.mjs';
import { T as Telemetry, I as InstrumentClass } from './telemetry.mjs';
import { r as registerHook } from './hooks.mjs';
import { MastraError } from './@mastra-core-error.mjs';
import { _ as __decoratorStart, b as __decorateElement, c as __runInitializers } from './workflows.mjs';
import EventEmitter from 'events';

// A simple TTL cache with max capacity option, ms resolution,
// autopurge, and reasonably optimized performance
// Relies on the fact that integer Object keys are kept sorted,
// and managed very efficiently by V8.

/* istanbul ignore next */
const perf =
  typeof performance === 'object' &&
  performance &&
  typeof performance.now === 'function'
    ? performance
    : Date;

const now = () => perf.now();
const isPosInt = n => n && n === Math.floor(n) && n > 0 && isFinite(n);
const isPosIntOrInf = n => n === Infinity || isPosInt(n);

class TTLCache {
  constructor({
    max = Infinity,
    ttl,
    updateAgeOnGet = false,
    checkAgeOnGet = false,
    noUpdateTTL = false,
    dispose,
    noDisposeOnSet = false,
  } = {}) {
    // {[expirationTime]: [keys]}
    this.expirations = Object.create(null);
    // {key=>val}
    this.data = new Map();
    // {key=>expiration}
    this.expirationMap = new Map();
    if (ttl !== undefined && !isPosIntOrInf(ttl)) {
      throw new TypeError(
        'ttl must be positive integer or Infinity if set'
      )
    }
    if (!isPosIntOrInf(max)) {
      throw new TypeError('max must be positive integer or Infinity')
    }
    this.ttl = ttl;
    this.max = max;
    this.updateAgeOnGet = !!updateAgeOnGet;
    this.checkAgeOnGet = !!checkAgeOnGet;
    this.noUpdateTTL = !!noUpdateTTL;
    this.noDisposeOnSet = !!noDisposeOnSet;
    if (dispose !== undefined) {
      if (typeof dispose !== 'function') {
        throw new TypeError('dispose must be function if set')
      }
      this.dispose = dispose;
    }

    this.timer = undefined;
    this.timerExpiration = undefined;
  }

  setTimer(expiration, ttl) {
    if (this.timerExpiration < expiration) {
      return
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }

    const t = setTimeout(() => {
      this.timer = undefined;
      this.timerExpiration = undefined;
      this.purgeStale();
      for (const exp in this.expirations) {
        this.setTimer(exp, exp - now());
        break
      }
    }, ttl);

    /* istanbul ignore else - affordance for non-node envs */
    if (t.unref) t.unref();

    this.timerExpiration = expiration;
    this.timer = t;
  }

  // hang onto the timer so we can clearTimeout if all items
  // are deleted.  Deno doesn't have Timer.unref(), so it
  // hangs otherwise.
  cancelTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timerExpiration = undefined;
      this.timer = undefined;
    }
  }

  /* istanbul ignore next */
  cancelTimers() {
    process.emitWarning(
      'TTLCache.cancelTimers has been renamed to ' +
        'TTLCache.cancelTimer (no "s"), and will be removed in the next ' +
        'major version update'
    );
    return this.cancelTimer()
  }

  clear() {
    const entries =
      this.dispose !== TTLCache.prototype.dispose ? [...this] : [];
    this.data.clear();
    this.expirationMap.clear();
    // no need for any purging now
    this.cancelTimer();
    this.expirations = Object.create(null);
    for (const [key, val] of entries) {
      this.dispose(val, key, 'delete');
    }
  }

  setTTL(key, ttl = this.ttl) {
    const current = this.expirationMap.get(key);
    if (current !== undefined) {
      // remove from the expirations list, so it isn't purged
      const exp = this.expirations[current];
      if (!exp || exp.length <= 1) {
        delete this.expirations[current];
      } else {
        this.expirations[current] = exp.filter(k => k !== key);
      }
    }

    if (ttl !== Infinity) {
      const expiration = Math.floor(now() + ttl);
      this.expirationMap.set(key, expiration);
      if (!this.expirations[expiration]) {
        this.expirations[expiration] = [];
        this.setTimer(expiration, ttl);
      }
      this.expirations[expiration].push(key);
    } else {
      this.expirationMap.set(key, Infinity);
    }
  }

  set(
    key,
    val,
    {
      ttl = this.ttl,
      noUpdateTTL = this.noUpdateTTL,
      noDisposeOnSet = this.noDisposeOnSet,
    } = {}
  ) {
    if (!isPosIntOrInf(ttl)) {
      throw new TypeError('ttl must be positive integer or Infinity')
    }
    if (this.expirationMap.has(key)) {
      if (!noUpdateTTL) {
        this.setTTL(key, ttl);
      }
      // has old value
      const oldValue = this.data.get(key);
      if (oldValue !== val) {
        this.data.set(key, val);
        if (!noDisposeOnSet) {
          this.dispose(oldValue, key, 'set');
        }
      }
    } else {
      this.setTTL(key, ttl);
      this.data.set(key, val);
    }

    while (this.size > this.max) {
      this.purgeToCapacity();
    }

    return this
  }

  has(key) {
    return this.data.has(key)
  }

  getRemainingTTL(key) {
    const expiration = this.expirationMap.get(key);
    return expiration === Infinity
      ? expiration
      : expiration !== undefined
      ? Math.max(0, Math.ceil(expiration - now()))
      : 0
  }

  get(
    key,
    {
      updateAgeOnGet = this.updateAgeOnGet,
      ttl = this.ttl,
      checkAgeOnGet = this.checkAgeOnGet,
    } = {}
  ) {
    const val = this.data.get(key);
    if (checkAgeOnGet && this.getRemainingTTL(key) === 0) {
      this.delete(key);
      return undefined
    }
    if (updateAgeOnGet) {
      this.setTTL(key, ttl);
    }
    return val
  }

  dispose(_, __) {}

  delete(key) {
    const current = this.expirationMap.get(key);
    if (current !== undefined) {
      const value = this.data.get(key);
      this.data.delete(key);
      this.expirationMap.delete(key);
      const exp = this.expirations[current];
      if (exp) {
        if (exp.length <= 1) {
          delete this.expirations[current];
        } else {
          this.expirations[current] = exp.filter(k => k !== key);
        }
      }
      this.dispose(value, key, 'delete');
      if (this.size === 0) {
        this.cancelTimer();
      }
      return true
    }
    return false
  }

  purgeToCapacity() {
    for (const exp in this.expirations) {
      const keys = this.expirations[exp];
      if (this.size - keys.length >= this.max) {
        delete this.expirations[exp];
        const entries = [];
        for (const key of keys) {
          entries.push([key, this.data.get(key)]);
          this.data.delete(key);
          this.expirationMap.delete(key);
        }
        for (const [key, val] of entries) {
          this.dispose(val, key, 'evict');
        }
      } else {
        const s = this.size - this.max;
        const entries = [];
        for (const key of keys.splice(0, s)) {
          entries.push([key, this.data.get(key)]);
          this.data.delete(key);
          this.expirationMap.delete(key);
        }
        for (const [key, val] of entries) {
          this.dispose(val, key, 'evict');
        }
        return
      }
    }
  }

  get size() {
    return this.data.size
  }

  purgeStale() {
    const n = Math.ceil(now());
    for (const exp in this.expirations) {
      if (exp === 'Infinity' || exp > n) {
        return
      }

      /* istanbul ignore next
       * mysterious need for a guard here?
       * https://github.com/isaacs/ttlcache/issues/26 */
      const keys = [...(this.expirations[exp] || [])];
      const entries = [];
      delete this.expirations[exp];
      for (const key of keys) {
        entries.push([key, this.data.get(key)]);
        this.data.delete(key);
        this.expirationMap.delete(key);
      }
      for (const [key, val] of entries) {
        this.dispose(val, key, 'stale');
      }
    }
    if (this.size === 0) {
      this.cancelTimer();
    }
  }

  *entries() {
    for (const exp in this.expirations) {
      for (const key of this.expirations[exp]) {
        yield [key, this.data.get(key)];
      }
    }
  }
  *keys() {
    for (const exp in this.expirations) {
      for (const key of this.expirations[exp]) {
        yield key;
      }
    }
  }
  *values() {
    for (const exp in this.expirations) {
      for (const key of this.expirations[exp]) {
        yield this.data.get(key);
      }
    }
  }
  [Symbol.iterator]() {
    return this.entries()
  }
}

var ttlcache = TTLCache;

var TTLCache$1 = /*@__PURE__*/getDefaultExportFromCjs(ttlcache);

// src/cache/base.ts
var MastraServerCache = class extends MastraBase {
  constructor({ name }) {
    super({
      component: "SERVER_CACHE",
      name
    });
  }
};

// src/cache/inmemory.ts
var InMemoryServerCache = class extends MastraServerCache {
  cache = new TTLCache$1({
    max: 1e3,
    ttl: 1e3 * 60 * 5
  });
  constructor() {
    super({ name: "InMemoryServerCache" });
  }
  async get(key) {
    return this.cache.get(key);
  }
  async set(key, value) {
    this.cache.set(key, value);
  }
  async listLength(key) {
    const list = this.cache.get(key);
    if (!Array.isArray(list)) {
      throw new Error(`${key} is not an array`);
    }
    return list.length;
  }
  async listPush(key, value) {
    const list = this.cache.get(key);
    if (Array.isArray(list)) {
      list.push(value);
    } else {
      this.cache.set(key, [value]);
    }
  }
  async listFromTo(key, from, to = -1) {
    const list = this.cache.get(key);
    if (Array.isArray(list)) {
      const endIndex = to === -1 ? void 0 : to + 1;
      return list.slice(from, endIndex);
    }
    return [];
  }
  async delete(key) {
    this.cache.delete(key);
  }
  async clear() {
    this.cache.clear();
  }
};

// src/events/pubsub.ts
var PubSub = class {
};

// src/logger/noop-logger.ts
var noopLogger = {
  debug: () => {
  },
  info: () => {
  },
  warn: () => {
  },
  error: () => {
  },
  cleanup: async () => {
  },
  getTransports: () => /* @__PURE__ */ new Map(),
  trackException: () => {
  },
  getLogs: async () => ({ logs: [], total: 0, page: 1, perPage: 100, hasMore: false }),
  getLogsByRunId: async () => ({ logs: [], total: 0, page: 1, perPage: 100, hasMore: false })
};

var EventEmitterPubSub = class extends PubSub {
  emitter;
  constructor() {
    super();
    this.emitter = new EventEmitter();
  }
  async publish(topic, event) {
    const id = crypto.randomUUID();
    const createdAt = /* @__PURE__ */new Date();
    this.emitter.emit(topic, {
      ...event,
      id,
      createdAt
    });
  }
  async subscribe(topic, cb) {
    this.emitter.on(topic, cb);
  }
  async unsubscribe(topic, cb) {
    this.emitter.off(topic, cb);
  }
  async flush() {}
};

// src/mastra/hooks.ts
function createOnScorerHook(mastra) {
  return async hookData => {
    const storage = mastra.getStorage();
    if (!storage) {
      mastra.getLogger()?.warn("Storage not found, skipping score validation and saving");
      return;
    }
    const entityId = hookData.entity.id;
    const entityType = hookData.entityType;
    const scorer = hookData.scorer;
    try {
      const scorerToUse = await findScorer(mastra, entityId, entityType, scorer.name);
      if (!scorerToUse) {
        throw new MastraError({
          id: "MASTRA_SCORER_NOT_FOUND",
          domain: "MASTRA" /* MASTRA */,
          category: "USER" /* USER */,
          text: `Scorer with ID ${hookData.scorer.id} not found`
        });
      }
      let input = hookData.input;
      let output = hookData.output;
      const {
        structuredOutput,
        ...rest
      } = hookData;
      const runResult = await scorerToUse.scorer.run({
        ...rest,
        input,
        output
      });
      const payload = {
        ...rest,
        ...runResult,
        entityId,
        scorerId: hookData.scorer.name,
        metadata: {
          structuredOutput: !!structuredOutput
        }
      };
      await validateAndSaveScore(storage, payload);
    } catch (error) {
      const mastraError = new MastraError({
        id: "MASTRA_SCORER_FAILED_TO_RUN_HOOK",
        domain: "SCORER" /* SCORER */,
        category: "USER" /* USER */,
        details: {
          scorerId: scorer.id,
          entityId,
          entityType
        }
      }, error);
      mastra.getLogger()?.trackException(mastraError);
      mastra.getLogger()?.error(mastraError.toString());
    }
  };
}
async function validateAndSaveScore(storage, payload) {
  const payloadToSave = saveScorePayloadSchema.parse(payload);
  await storage?.saveScore(payloadToSave);
}
async function findScorer(mastra, entityId, entityType, scorerName) {
  let scorerToUse;
  if (entityType === "AGENT") {
    const scorers = await mastra.getAgentById(entityId).getScorers();
    for (const [_, scorer] of Object.entries(scorers)) {
      if (scorer.scorer.name === scorerName) {
        scorerToUse = scorer;
        break;
      }
    }
  } else if (entityType === "WORKFLOW") {
    const scorers = await mastra.getWorkflowById(entityId).getScorers();
    for (const [_, scorer] of Object.entries(scorers)) {
      if (scorer.scorer.name === scorerName) {
        scorerToUse = scorer;
        break;
      }
    }
  }
  if (!scorerToUse) {
    const mastraRegisteredScorer = mastra.getScorerByName(scorerName);
    scorerToUse = mastraRegisteredScorer ? {
      scorer: mastraRegisteredScorer
    } : void 0;
  }
  return scorerToUse;
}

// src/mastra/index.ts
var _Mastra_decorators, _init;
_Mastra_decorators = [InstrumentClass({
  prefix: "mastra",
  excludeMethods: ["getLogger", "getTelemetry"]
})];
var Mastra = class {
  #vectors;
  #agents;
  #logger;
  #legacy_workflows;
  #workflows;
  #tts;
  #deployer;
  #serverMiddleware = [];
  #telemetry;
  #storage;
  #memory;
  #vnext_networks;
  #scorers;
  #server;
  #mcpServers;
  #bundler;
  #idGenerator;
  #pubsub;
  #events = {};
  #internalMastraWorkflows = {};
  // This is only used internally for server handlers that require temporary persistence
  #serverCache;
  /**
   * @deprecated use getTelemetry() instead
   */
  get telemetry() {
    return this.#telemetry;
  }
  /**
   * @deprecated use getStorage() instead
   */
  get storage() {
    return this.#storage;
  }
  /**
   * @deprecated use getMemory() instead
   */
  get memory() {
    return this.#memory;
  }
  get pubsub() {
    return this.#pubsub;
  }
  getIdGenerator() {
    return this.#idGenerator;
  }
  /**
   * Generate a unique identifier using the configured generator or default to crypto.randomUUID()
   * @returns A unique string ID
   */
  generateId() {
    if (this.#idGenerator) {
      const id = this.#idGenerator();
      if (!id) {
        const error = new MastraError({
          id: "MASTRA_ID_GENERATOR_RETURNED_EMPTY_STRING",
          domain: "MASTRA" /* MASTRA */,
          category: "USER" /* USER */,
          text: "ID generator returned an empty string, which is not allowed"
        });
        this.#logger?.trackException(error);
        throw error;
      }
      return id;
    }
    return crypto.randomUUID();
  }
  setIdGenerator(idGenerator) {
    this.#idGenerator = idGenerator;
  }
  constructor(config) {
    if (config?.serverMiddleware) {
      this.#serverMiddleware = config.serverMiddleware.map(m => ({
        handler: m.handler,
        path: m.path || "/api/*"
      }));
    }
    this.#serverCache = new InMemoryServerCache();
    if (config?.pubsub) {
      this.#pubsub = config.pubsub;
    } else {
      this.#pubsub = new EventEmitterPubSub();
    }
    this.#events = {};
    for (const topic in config?.events ?? {}) {
      if (!Array.isArray(config?.events?.[topic])) {
        this.#events[topic] = [config?.events?.[topic]];
      } else {
        this.#events[topic] = config?.events?.[topic] ?? [];
      }
    }
    const workflowEventProcessor = new WorkflowEventProcessor({
      mastra: this
    });
    const workflowEventCb = async (event, cb) => {
      try {
        await workflowEventProcessor.process(event, cb);
      } catch (e) {
        console.error("Error processing event", e);
      }
    };
    if (this.#events.workflows) {
      this.#events.workflows.push(workflowEventCb);
    } else {
      this.#events.workflows = [workflowEventCb];
    }
    let logger;
    if (config?.logger === false) {
      logger = noopLogger;
    } else {
      if (config?.logger) {
        logger = config.logger;
      } else {
        const levelOnEnv = process.env.NODE_ENV === "production" && process.env.MASTRA_DEV !== "true" ? LogLevel.WARN : LogLevel.INFO;
        logger = new ConsoleLogger({
          name: "Mastra",
          level: levelOnEnv
        });
      }
    }
    this.#logger = logger;
    this.#idGenerator = config?.idGenerator;
    let storage = config?.storage;
    if (storage) {
      storage = augmentWithInit(storage);
    }
    this.#telemetry = Telemetry.init(config?.telemetry);
    if (config?.telemetry?.enabled !== false && typeof globalThis !== "undefined" && globalThis.___MASTRA_TELEMETRY___ !== true) {
      this.#logger?.warn(`Mastra telemetry is enabled, but the required instrumentation file was not loaded. If you are using Mastra outside of the mastra server environment, see: https://mastra.ai/en/docs/observability/tracing#tracing-outside-mastra-server-environment`, `If you are using a custom instrumentation file or want to disable this warning, set the globalThis.___MASTRA_TELEMETRY___ variable to true in your instrumentation file.`);
    }
    if (config?.observability) {
      setupAITracing(config.observability);
    }
    if (this.#telemetry && storage) {
      this.#storage = this.#telemetry.traceClass(storage, {
        excludeMethods: ["__setTelemetry", "__getTelemetry", "batchTraceInsert", "getTraces", "getEvalsByAgentName"]
      });
      this.#storage.__setTelemetry(this.#telemetry);
    } else {
      this.#storage = storage;
    }
    if (config?.vectors) {
      let vectors = {};
      Object.entries(config.vectors).forEach(([key, vector]) => {
        if (this.#telemetry) {
          vectors[key] = this.#telemetry.traceClass(vector, {
            excludeMethods: ["__setTelemetry", "__getTelemetry"]
          });
          vectors[key].__setTelemetry(this.#telemetry);
        } else {
          vectors[key] = vector;
        }
      });
      this.#vectors = vectors;
    }
    if (config?.vnext_networks) {
      this.#vnext_networks = config.vnext_networks;
    }
    if (config?.mcpServers) {
      this.#mcpServers = config.mcpServers;
      Object.entries(this.#mcpServers).forEach(([key, server]) => {
        server.setId(key);
        if (this.#telemetry) {
          server.__setTelemetry(this.#telemetry);
        }
        server.__registerMastra(this);
        server.__setLogger(this.getLogger());
      });
    }
    if (config && `memory` in config) {
      const error = new MastraError({
        id: "MASTRA_CONSTRUCTOR_INVALID_MEMORY_CONFIG",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `
  Memory should be added to Agents, not to Mastra.

Instead of:
  new Mastra({ memory: new Memory() })

do:
  new Agent({ memory: new Memory() })
`
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (config?.tts) {
      this.#tts = config.tts;
      Object.entries(this.#tts).forEach(([key, ttsCl]) => {
        if (this.#tts?.[key]) {
          if (this.#telemetry) {
            this.#tts[key] = this.#telemetry.traceClass(ttsCl, {
              excludeMethods: ["__setTelemetry", "__getTelemetry"]
            });
            this.#tts[key].__setTelemetry(this.#telemetry);
          }
        }
      });
    }
    const agents = {};
    if (config?.agents) {
      Object.entries(config.agents).forEach(([key, agent]) => {
        if (agents[key]) {
          const error = new MastraError({
            id: "MASTRA_AGENT_REGISTRATION_DUPLICATE_ID",
            domain: "MASTRA" /* MASTRA */,
            category: "USER" /* USER */,
            text: `Agent with name ID:${key} already exists`,
            details: {
              agentId: key
            }
          });
          this.#logger?.trackException(error);
          throw error;
        }
        agent.__registerMastra(this);
        agent.__registerPrimitives({
          logger: this.getLogger(),
          telemetry: this.#telemetry,
          storage: this.storage,
          memory: this.memory,
          agents,
          tts: this.#tts,
          vectors: this.#vectors
        });
        agents[key] = agent;
      });
    }
    this.#agents = agents;
    this.#vnext_networks = {};
    if (config?.vnext_networks) {
      Object.entries(config.vnext_networks).forEach(([key, network]) => {
        network.__registerMastra(this);
        this.#vnext_networks[key] = network;
      });
    }
    const scorers = {};
    if (config?.scorers) {
      Object.entries(config.scorers).forEach(([key, scorer]) => {
        scorers[key] = scorer;
      });
    }
    this.#scorers = scorers;
    this.#legacy_workflows = {};
    if (config?.legacy_workflows) {
      Object.entries(config.legacy_workflows).forEach(([key, workflow]) => {
        workflow.__registerMastra(this);
        workflow.__registerPrimitives({
          logger: this.getLogger(),
          telemetry: this.#telemetry,
          storage: this.storage,
          memory: this.memory,
          agents,
          tts: this.#tts,
          vectors: this.#vectors
        });
        this.#legacy_workflows[key] = workflow;
        const workflowSteps = Object.values(workflow.steps).filter(step => !!step.workflowId && !!step.workflow);
        if (workflowSteps.length > 0) {
          workflowSteps.forEach(step => {
            this.#legacy_workflows[step.workflowId] = step.workflow;
          });
        }
      });
    }
    this.#workflows = {};
    if (config?.workflows) {
      Object.entries(config.workflows).forEach(([key, workflow]) => {
        workflow.__registerMastra(this);
        workflow.__registerPrimitives({
          logger: this.getLogger(),
          telemetry: this.#telemetry,
          storage: this.storage,
          memory: this.memory,
          agents,
          tts: this.#tts,
          vectors: this.#vectors
        });
        this.#workflows[key] = workflow;
      });
    }
    if (config?.server) {
      this.#server = config.server;
    }
    registerHook("onScorerRun" /* ON_SCORER_RUN */, createOnScorerHook(this));
    if (config?.observability) {
      this.registerAITracingExporters();
      this.initAITracingExporters();
    }
    this.setLogger({
      logger
    });
  }
  /**
   * Register this Mastra instance with AI tracing exporters that need it
   */
  registerAITracingExporters() {
    const allTracingInstances = getAllAITracing();
    allTracingInstances.forEach(tracing => {
      const exporters = tracing.getExporters();
      exporters.forEach(exporter => {
        if ("__registerMastra" in exporter && typeof exporter.__registerMastra === "function") {
          exporter.__registerMastra(this);
        }
      });
    });
  }
  /**
   * Initialize all AI tracing exporters after registration is complete
   */
  initAITracingExporters() {
    const allTracingInstances = getAllAITracing();
    allTracingInstances.forEach(tracing => {
      const exporters = tracing.getExporters();
      exporters.forEach(exporter => {
        if ("init" in exporter && typeof exporter.init === "function") {
          try {
            exporter.init();
          } catch (error) {
            this.#logger?.warn("Failed to initialize AI tracing exporter", {
              exporterName: exporter.name,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      });
    });
  }
  getAgent(name) {
    const agent = this.#agents?.[name];
    if (!agent) {
      const error = new MastraError({
        id: "MASTRA_GET_AGENT_BY_NAME_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Agent with name ${String(name)} not found`,
        details: {
          status: 404,
          agentName: String(name),
          agents: Object.keys(this.#agents ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return this.#agents[name];
  }
  getAgentById(id) {
    let agent = Object.values(this.#agents).find(a => a.id === id);
    if (!agent) {
      try {
        agent = this.getAgent(id);
      } catch {}
    }
    if (!agent) {
      const error = new MastraError({
        id: "MASTRA_GET_AGENT_BY_AGENT_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Agent with id ${String(id)} not found`,
        details: {
          status: 404,
          agentId: String(id),
          agents: Object.keys(this.#agents ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return agent;
  }
  getAgents() {
    return this.#agents;
  }
  getVector(name) {
    const vector = this.#vectors?.[name];
    if (!vector) {
      const error = new MastraError({
        id: "MASTRA_GET_VECTOR_BY_NAME_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Vector with name ${String(name)} not found`,
        details: {
          status: 404,
          vectorName: String(name),
          vectors: Object.keys(this.#vectors ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return vector;
  }
  getVectors() {
    return this.#vectors;
  }
  getDeployer() {
    return this.#deployer;
  }
  legacy_getWorkflow(id, {
    serialized
  } = {}) {
    const workflow = this.#legacy_workflows?.[id];
    if (!workflow) {
      const error = new MastraError({
        id: "MASTRA_GET_LEGACY_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Workflow with ID ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id),
          workflows: Object.keys(this.#legacy_workflows ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (serialized) {
      return {
        name: workflow.name
      };
    }
    return workflow;
  }
  getWorkflow(id, {
    serialized
  } = {}) {
    const workflow = this.#workflows?.[id];
    if (!workflow) {
      const error = new MastraError({
        id: "MASTRA_GET_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Workflow with ID ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id),
          workflows: Object.keys(this.#workflows ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (serialized) {
      return {
        name: workflow.name
      };
    }
    return workflow;
  }
  __registerInternalWorkflow(workflow) {
    workflow.__registerMastra(this);
    workflow.__registerPrimitives({
      logger: this.getLogger(),
      storage: this.storage
    });
    this.#internalMastraWorkflows[workflow.id] = workflow;
  }
  __hasInternalWorkflow(id) {
    return Object.values(this.#internalMastraWorkflows).some(workflow => workflow.id === id);
  }
  __getInternalWorkflow(id) {
    const workflow = Object.values(this.#internalMastraWorkflows).find(a => a.id === id);
    if (!workflow) {
      throw new MastraError({
        id: "MASTRA_GET_INTERNAL_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "SYSTEM" /* SYSTEM */,
        text: `Workflow with id ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id)
        }
      });
    }
    return workflow;
  }
  getWorkflowById(id) {
    let workflow = Object.values(this.#workflows).find(a => a.id === id);
    if (!workflow) {
      try {
        workflow = this.getWorkflow(id);
      } catch {}
    }
    if (!workflow) {
      const error = new MastraError({
        id: "MASTRA_GET_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Workflow with id ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id),
          workflows: Object.keys(this.#workflows ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return workflow;
  }
  legacy_getWorkflows(props = {}) {
    if (props.serialized) {
      return Object.entries(this.#legacy_workflows).reduce((acc, [k, v]) => {
        return {
          ...acc,
          [k]: {
            name: v.name
          }
        };
      }, {});
    }
    return this.#legacy_workflows;
  }
  getScorers() {
    return this.#scorers;
  }
  getScorer(key) {
    const scorer = this.#scorers?.[key];
    if (!scorer) {
      const error = new MastraError({
        id: "MASTRA_GET_SCORER_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Scorer with ${String(key)} not found`
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return scorer;
  }
  getScorerByName(name) {
    for (const [_key, value] of Object.entries(this.#scorers ?? {})) {
      if (value.name === name) {
        return value;
      }
    }
    const error = new MastraError({
      id: "MASTRA_GET_SCORER_BY_NAME_NOT_FOUND",
      domain: "MASTRA" /* MASTRA */,
      category: "USER" /* USER */,
      text: `Scorer with name ${String(name)} not found`
    });
    this.#logger?.trackException(error);
    throw error;
  }
  getWorkflows(props = {}) {
    if (props.serialized) {
      return Object.entries(this.#workflows).reduce((acc, [k, v]) => {
        return {
          ...acc,
          [k]: {
            name: v.name
          }
        };
      }, {});
    }
    return this.#workflows;
  }
  setStorage(storage) {
    this.#storage = augmentWithInit(storage);
  }
  setLogger({
    logger
  }) {
    this.#logger = logger;
    if (this.#agents) {
      Object.keys(this.#agents).forEach(key => {
        this.#agents?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#memory) {
      this.#memory.__setLogger(this.#logger);
    }
    if (this.#deployer) {
      this.#deployer.__setLogger(this.#logger);
    }
    if (this.#tts) {
      Object.keys(this.#tts).forEach(key => {
        this.#tts?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#storage) {
      this.#storage.__setLogger(this.#logger);
    }
    if (this.#vectors) {
      Object.keys(this.#vectors).forEach(key => {
        this.#vectors?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#mcpServers) {
      Object.keys(this.#mcpServers).forEach(key => {
        this.#mcpServers?.[key]?.__setLogger(this.#logger);
      });
    }
    const allTracingInstances = getAllAITracing();
    allTracingInstances.forEach(instance => {
      instance.__setLogger(this.#logger);
    });
  }
  setTelemetry(telemetry) {
    this.#telemetry = Telemetry.init(telemetry);
    if (this.#agents) {
      Object.keys(this.#agents).forEach(key => {
        if (this.#telemetry) {
          this.#agents?.[key]?.__setTelemetry(this.#telemetry);
        }
      });
    }
    if (this.#memory) {
      this.#memory = this.#telemetry.traceClass(this.#memory, {
        excludeMethods: ["__setTelemetry", "__getTelemetry"]
      });
      this.#memory.__setTelemetry(this.#telemetry);
    }
    if (this.#deployer) {
      this.#deployer = this.#telemetry.traceClass(this.#deployer, {
        excludeMethods: ["__setTelemetry", "__getTelemetry"]
      });
      this.#deployer.__setTelemetry(this.#telemetry);
    }
    if (this.#tts) {
      let tts = {};
      Object.entries(this.#tts).forEach(([key, ttsCl]) => {
        if (this.#telemetry) {
          tts[key] = this.#telemetry.traceClass(ttsCl, {
            excludeMethods: ["__setTelemetry", "__getTelemetry"]
          });
          tts[key].__setTelemetry(this.#telemetry);
        }
      });
      this.#tts = tts;
    }
    if (this.#storage) {
      this.#storage = this.#telemetry.traceClass(this.#storage, {
        excludeMethods: ["__setTelemetry", "__getTelemetry"]
      });
      this.#storage.__setTelemetry(this.#telemetry);
    }
    if (this.#vectors) {
      let vectors = {};
      Object.entries(this.#vectors).forEach(([key, vector]) => {
        if (this.#telemetry) {
          vectors[key] = this.#telemetry.traceClass(vector, {
            excludeMethods: ["__setTelemetry", "__getTelemetry"]
          });
          vectors[key].__setTelemetry(this.#telemetry);
        }
      });
      this.#vectors = vectors;
    }
  }
  getTTS() {
    return this.#tts;
  }
  getLogger() {
    return this.#logger;
  }
  getTelemetry() {
    return this.#telemetry;
  }
  getMemory() {
    return this.#memory;
  }
  getStorage() {
    return this.#storage;
  }
  getServerMiddleware() {
    return this.#serverMiddleware;
  }
  getServerCache() {
    return this.#serverCache;
  }
  setServerMiddleware(serverMiddleware) {
    if (typeof serverMiddleware === "function") {
      this.#serverMiddleware = [{
        handler: serverMiddleware,
        path: "/api/*"
      }];
      return;
    }
    if (!Array.isArray(serverMiddleware)) {
      const error = new MastraError({
        id: "MASTRA_SET_SERVER_MIDDLEWARE_INVALID_TYPE",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Invalid middleware: expected a function or array, received ${typeof serverMiddleware}`
      });
      this.#logger?.trackException(error);
      throw error;
    }
    this.#serverMiddleware = serverMiddleware.map(m => {
      if (typeof m === "function") {
        return {
          handler: m,
          path: "/api/*"
        };
      }
      return {
        handler: m.handler,
        path: m.path || "/api/*"
      };
    });
  }
  vnext_getNetworks() {
    return Object.values(this.#vnext_networks || {});
  }
  getServer() {
    return this.#server;
  }
  getBundlerConfig() {
    return this.#bundler;
  }
  vnext_getNetwork(networkId) {
    const networks = this.vnext_getNetworks();
    return networks.find(network => network.id === networkId);
  }
  async getLogsByRunId({
    runId,
    transportId,
    fromDate,
    toDate,
    logLevel,
    filters,
    page,
    perPage
  }) {
    if (!transportId) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_BY_RUN_ID_MISSING_TRANSPORT",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: "Transport ID is required",
        details: {
          runId,
          transportId
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (!this.#logger?.getLogsByRunId) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_BY_RUN_ID_LOGGER_NOT_CONFIGURED",
        domain: "MASTRA" /* MASTRA */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Logger is not configured or does not support getLogsByRunId operation",
        details: {
          runId,
          transportId
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return await this.#logger.getLogsByRunId({
      runId,
      transportId,
      fromDate,
      toDate,
      logLevel,
      filters,
      page,
      perPage
    });
  }
  async getLogs(transportId, params) {
    if (!transportId) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_MISSING_TRANSPORT",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: "Transport ID is required",
        details: {
          transportId
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (!this.#logger) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_LOGGER_NOT_CONFIGURED",
        domain: "MASTRA" /* MASTRA */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Logger is not set",
        details: {
          transportId
        }
      });
      throw error;
    }
    return await this.#logger.getLogs(transportId, params);
  }
  /**
   * Get all registered MCP server instances.
   * @returns A record of MCP server ID to MCPServerBase instance, or undefined if none are registered.
   */
  getMCPServers() {
    return this.#mcpServers;
  }
  /**
   * Get a specific MCP server instance.
   * If a version is provided, it attempts to find the server with that exact logical ID and version.
   * If no version is provided, it returns the server with the specified logical ID that has the most recent releaseDate.
   * The logical ID should match the `id` property of the MCPServer instance (typically set via MCPServerConfig.id).
   * @param serverId - The logical ID of the MCP server to retrieve.
   * @param version - Optional specific version of the MCP server to retrieve.
   * @returns The MCP server instance, or undefined if not found or if the specific version is not found.
   */
  getMCPServer(serverId, version) {
    if (!this.#mcpServers) {
      return void 0;
    }
    const allRegisteredServers = Object.values(this.#mcpServers || {});
    const matchingLogicalIdServers = allRegisteredServers.filter(server => server.id === serverId);
    if (matchingLogicalIdServers.length === 0) {
      this.#logger?.debug(`No MCP servers found with logical ID: ${serverId}`);
      return void 0;
    }
    if (version) {
      const specificVersionServer = matchingLogicalIdServers.find(server => server.version === version);
      if (!specificVersionServer) {
        this.#logger?.debug(`MCP server with logical ID '${serverId}' found, but not version '${version}'.`);
      }
      return specificVersionServer;
    } else {
      if (matchingLogicalIdServers.length === 1) {
        return matchingLogicalIdServers[0];
      }
      matchingLogicalIdServers.sort((a, b) => {
        const dateAVal = a.releaseDate && typeof a.releaseDate === "string" ? new Date(a.releaseDate).getTime() : NaN;
        const dateBVal = b.releaseDate && typeof b.releaseDate === "string" ? new Date(b.releaseDate).getTime() : NaN;
        if (isNaN(dateAVal) && isNaN(dateBVal)) return 0;
        if (isNaN(dateAVal)) return 1;
        if (isNaN(dateBVal)) return -1;
        return dateBVal - dateAVal;
      });
      if (matchingLogicalIdServers.length > 0) {
        const latestServer = matchingLogicalIdServers[0];
        if (latestServer && latestServer.releaseDate && typeof latestServer.releaseDate === "string" && !isNaN(new Date(latestServer.releaseDate).getTime())) {
          return latestServer;
        }
      }
      this.#logger?.warn(`Could not determine the latest server for logical ID '${serverId}' due to invalid or missing release dates, or no servers left after filtering.`);
      return void 0;
    }
  }
  async addTopicListener(topic, listener) {
    await this.#pubsub.subscribe(topic, listener);
  }
  async removeTopicListener(topic, listener) {
    await this.#pubsub.unsubscribe(topic, listener);
  }
  async startEventEngine() {
    for (const topic in this.#events) {
      if (!this.#events[topic]) {
        continue;
      }
      const listeners = Array.isArray(this.#events[topic]) ? this.#events[topic] : [this.#events[topic]];
      for (const listener of listeners) {
        await this.#pubsub.subscribe(topic, listener);
      }
    }
  }
  async stopEventEngine() {
    for (const topic in this.#events) {
      if (!this.#events[topic]) {
        continue;
      }
      const listeners = Array.isArray(this.#events[topic]) ? this.#events[topic] : [this.#events[topic]];
      for (const listener of listeners) {
        await this.#pubsub.unsubscribe(topic, listener);
      }
    }
    await this.#pubsub.flush();
  }
  /**
   * Shutdown Mastra and clean up all resources
   */
  async shutdown() {
    await shutdownAITracingRegistry();
    await this.stopEventEngine();
    this.#logger?.info("Mastra shutdown completed");
  }
  // This method is only used internally for server hnadlers that require temporary persistence
  get serverCache() {
    return this.#serverCache;
  }
};
Mastra = /*@__PURE__*/(_ => {
  _init = __decoratorStart(null);
  Mastra = __decorateElement(_init, 0, "Mastra", _Mastra_decorators, Mastra);
  __runInitializers(_init, 1, Mastra);
  return Mastra;
})();

export { Mastra };
