import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';

@Injectable()
export class WinstonLoggerService {
    readonly rootDir: string;
    private readonly winstonLogger: winston.Logger;

    constructor(private readonly config: ConfigService) {
        this.rootDir = path.resolve(
            process.cwd(),
            this.config.get<string>('LOG_DIR', 'logs'),
        );
        if (!fs.existsSync(this.rootDir)) {
            fs.mkdirSync(this.rootDir, {recursive: true});
        }
        const combinedPath = path.join(this.rootDir, 'combined.log');
        const errorPath = path.join(this.rootDir, 'error.log');

        this.winstonLogger = winston.createLogger({
            level: this.config.get<string>('LOG_LEVEL', 'info'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({stack: true}),
                winston.format.json(),
            ),
            transports: [
                new winston.transports.File({
                    filename: errorPath,
                    level: 'error',
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 5,
                }),
                new winston.transports.File({
                    filename: combinedPath,
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 5,
                }),
            ],
        });

        if (this.config.get<string>('NODE_ENV', 'development') !== 'production') {
            this.winstonLogger.add(
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple(),
                    ),
                }),
            );
        }
    }

    get logger(): winston.Logger {
        return this.winstonLogger;
    }
}
