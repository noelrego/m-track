import { Injectable, LoggerService } from '@nestjs/common';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

@Injectable()
export class AppLogger implements LoggerService {
  private readonly level: LogLevel = this.resolveLogLevel(process.env.LOG_LEVEL);

  info(message: string): void {
    this.write('info', message);
  }

  log(message: unknown): void {
    this.info(String(message));
  }

  warn(message: string, data?: unknown): void {
    this.write('warn', message, data);
  }

  debug(message: string, data?: unknown): void {
    this.write('debug', message, data);
  }

  error(errorOrMessage: unknown, message = 'Unexpected error', data?: unknown): void {
    if (!(errorOrMessage instanceof Error)) {
      const metadata = message === 'Unexpected error' && data === undefined
        ? undefined
        : { trace: message, context: data };

      this.write('error', String(errorOrMessage), metadata);
      return;
    }

    const errorData = this.serializeError(errorOrMessage);
    const metadata = data === undefined ? errorData : { error: errorData, data };

    this.write('error', message, metadata);
  }

  verbose(message: string, data?: unknown): void {
    this.debug(message, data);
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const source = this.getCallerSource();
    const metadata = data === undefined ? '' : `, ${this.safeStringify(data)}`;
    const line = `[${timestamp}] - [${level}] - [${source}] - "${message}"${metadata}`;

    if (level === 'error') {
      console.error(line);
      return;
    }

    console.log(line);
  }

  private shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[this.level];
  }

  private resolveLogLevel(level: string | undefined): LogLevel {
    if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
      return level;
    }

    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }

  private getCallerSource(): string {
    const stackLines = new Error().stack?.split('\n').slice(1) ?? [];
    const callerLine = stackLines.find(
      (line) =>
        !line.includes('app-logger.service') &&
        !line.includes('LoggerService') &&
        !line.includes('node:internal'),
    );

    if (!callerLine) {
      return 'unknown';
    }

    const parsed = callerLine.match(/at\s+(?:(?<fn>.+?)\s+\()?(?<file>.+?):(?<line>\d+):\d+\)?/);
    const filePath = parsed?.groups?.file ?? 'unknown';
    const functionName = parsed?.groups?.fn ?? 'anonymous';
    const lineNumber = parsed?.groups?.line;
    const fileName = filePath.split(/[\\/]/).pop()?.replace(/\.js$/, '.ts') ?? filePath;

    return `${fileName}${lineNumber ? `:${lineNumber}` : ''} ${functionName}`;
  }

  private serializeError(error: unknown): unknown {
    if (error instanceof Error) {
      const serialized: Record<string, unknown> = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      for (const key of Object.getOwnPropertyNames(error)) {
        if (!(key in serialized)) {
          serialized[key] = (error as unknown as Record<string, unknown>)[key];
        }
      }

      return serialized;
    }

    return error;
  }

  private safeStringify(value: unknown): string {
    const seen = new WeakSet<object>();

    return JSON.stringify(value, (key, nestedValue) => {
      if (this.isSensitiveKey(key)) {
        return '[REDACTED]';
      }

      if (typeof nestedValue === 'bigint') {
        return nestedValue.toString();
      }

      if (typeof nestedValue === 'object' && nestedValue !== null) {
        if (seen.has(nestedValue)) {
          return '[Circular]';
        }

        seen.add(nestedValue);
      }

      return nestedValue;
    });
  }

  private isSensitiveKey(key: string): boolean {
    return /password|token|secret|authorization/i.test(key);
  }
}
