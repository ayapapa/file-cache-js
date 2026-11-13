//import path from 'node:path';
//import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefaultLogger, FileCache } from '../src/index.ts';
//import { FileLock } from '@ayapapa-npm/file-lock-js';
//import { DefaultLogger } from '../src/lib/DefaultLogger.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const cache = new FileCache();
  await cache.purge({ force: true })
});

describe('DefaultLogger', () => {

  it("defaultConfig.", () => {
    expect(DefaultLogger.getConfig()).toMatchObject({
      debug: false
    });
  });

  it("setConfig {}.", () => {
    DefaultLogger.setConfig({});
    expect(DefaultLogger.getConfig()).toMatchObject({
      debug: false
    });
  });

  it("setConfig {debug: true}.", () => {
    DefaultLogger.setConfig({ debug: true });
    expect(DefaultLogger.getConfig()).toMatchObject({
      debug: true
    });
  });

  it("trace debug: false", () => {
    const spyC = vi.spyOn(console, 'error').mockImplementation((...arg: string[]) => {
      console.log(...arg);
    });
    try {
      DefaultLogger.setConfig({ debug: false });
      const msg = 'hohoho';
      DefaultLogger.trace(msg);
      expect(spyC).callCount(0);
    }
    finally {
      spyC.mockClear();
    }
  });

  it("trace debug: true", () => {
    DefaultLogger.setConfig({ debug: true });
    loggerTest('trace', 'error', (msg: string, args: string[]) => {
      expect(args).toBeDefined();
//      expect(spyC).calledOnceWith('Trace:', msg);
      expect(args[0]).toBe('Trace:');
      expect(args[1]).toBe(msg);
    });
    /*
    const spyC = vi.spyOn(console, 'error').mockImplementation((...arg: string[]) => {
      console.log(...arg);
    });
    try {
      DefaultLogger.setConfig({ debug: true });
      const msg = 'hohoho';
      DefaultLogger.trace(msg);
      expect(spyC).calledOnceWith('Trace:', msg);
    }
    finally {
      spyC.mockClear();
    }
      */
  });

  it("trace(): debug: true, stackOnTrace: true", () => {
    DefaultLogger.setConfig({ debug: true, stackOnTrace: true })
    loggerTest('trace', 'error', (msg: string, args: string[]) => {
      expect(args).toBeDefined();
      expect(args[0]).toBe('Trace:');
      expect(args[1]).toBe(msg);
      expect(args[2]).includes(`test/DefaultLogger.test.ts`);
    });
    /*
    let args!: string[];
    const spyC = vi.spyOn(console, 'error').mockImplementation((...a: string[]) => {
      args = a;
    });
    try {
      DefaultLogger.setConfig({ debug: true, stackOnTrace: true })
      const msg = 'hohoho';
      DefaultLogger.trace(msg);
      expect(args).toBeDefined();
      expect(args[0]).toBe('Trace:');
      expect(args[1]).toBe(msg);
      expect(args[2]).includes(`test/DefaultLogger.test.ts`);
    }
    finally {
      //spy.mockRestore();
      spyC.mockClear();
    }
      */
  });

  it("debug(): debug: false", () => {
    DefaultLogger.setConfig({ debug: false });
    loggerTest('debug', 'debug', (_msg: string, args: string[]) => {
      expect(args).toBeUndefined();
    });
    /*
    let args!: string[];
    const spyC = vi.spyOn(console, 'debug').mockImplementation((...a: string[]) => {
      args = a;
    });
    try {
      const msg = 'hohoho';
      DefaultLogger.debug(msg);
      expect(args).toBeUndefined();
    }
    finally {
      spyC.mockClear();
    }
      */
  });

  function loggerTest(
    method: 'trace' | 'debug' | 'log' | 'info' | 'warn' | 'error' | 'fatal', 
    cMethod: 'debug' | 'log' | 'info' | 'warn' | 'error',
    checkCb?: (msg: string, args: string[]) => void // additional check
  ): void {
    let args!: string[];
    const spyC = vi.spyOn(console, cMethod).mockImplementation((...a: string[]) => {
      args = a;
    });
    try {
      const msg = 'hohoho';
      DefaultLogger[method](msg);
      if (checkCb) {
        checkCb(msg, args);
      }
      else {
        expect(args).toBeDefined();
        expect(args.length).toBe(1);
        expect(args[0]).toBe(msg);
      }
    }
    finally {
      spyC.mockClear();
    }
  }

  it("debug(): debug: true", () => {
    DefaultLogger.setConfig({ debug: true });
    loggerTest('debug', 'debug');
    /*
    let args!: string[];
    const spyC = vi.spyOn(console, 'debug').mockImplementation((...a: string[]) => {
      args = a;
    });
    try {
      const msg = 'hohoho';
      DefaultLogger.debug(msg);
      expect(args).toBeDefined();
      expect(args.length).toBe(1);
      expect(args[0]).toBe(msg);      
    }
    finally {
      spyC.mockClear();
    }
      */
  });

  it("log()", () => {
    loggerTest('log', 'log');
    /*
    let args!: string[];
    const spyC = vi.spyOn(console, 'log').mockImplementation((...a: string[]) => {
      args = a;
    });
    try {
      const msg = 'hohoho';
      DefaultLogger.log(msg);
      expect(args).toBeDefined();
      expect(args.length).toBe(1);
      expect(args[0]).toBe(msg);      
    }
    finally {
      spyC.mockClear();
    }
      */
  });
  it("info()", () => {
    loggerTest('info', 'info');
  });

  it("warn()", () => {
    loggerTest('warn', 'warn');
  });

  it("error()", () => {
    loggerTest('error', 'error');
  });

  it("fatal()", () => {
    loggerTest('fatal', 'error');
  });

});
