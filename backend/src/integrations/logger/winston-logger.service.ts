import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';

// Winston service for writing logs
@Injectable()
export class WinstonLoggerService {
    readonly rootDir: string; // Root directory for logs
    private readonly winstonLogger: winston.Logger; // Winston logger instance

    constructor(private readonly config: ConfigService) {
        // Save root directory for logs
        this.rootDir = path.resolve(
            process.cwd(),
            this.config.get<string>('LOG_DIR', 'logs'),
        );

        if (!fs.existsSync(this.rootDir)) {
            fs.mkdirSync(this.rootDir, {recursive: true});
        }

        // Path for combined logs
        const combinedPath = path.join(this.rootDir, 'combined.log');

        // Path for error logs
        const errorPath = path.join(this.rootDir, 'error.log');

        // Create winston logger instance
        this.winstonLogger = winston.createLogger({
            level: this.config.get<string>('LOG_LEVEL', 'info'), // Log level
            format: winston.format.combine(
                winston.format.timestamp(), // Add timestamp to logs
                winston.format.errors({stack: true}), // Add stack trace to errors
                winston.format.json(), // Use JSON format for logs
            ),
            transports: [
                new winston.transports.File({
                    filename: errorPath, // Log errors to error.log
                    level: 'error', // Only log errors
                    maxsize: 10 * 1024 * 1024, // Max size of error.log file (10MB)
                    maxFiles: 5, // Max number of error.log files to keep
                }),
                new winston.transports.File({
                    filename: combinedPath, // Log all to combined.log
                    maxsize: 10 * 1024 * 1024, // Max size of combined.log file (10MB)
                    maxFiles: 5, // Max number of combined.log files to keep
                }),
            ],
        });

        // If not in production, add console transport for logging
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

    // Get the winston logger instance
    get logger(): winston.Logger {
        return this.winstonLogger;
    }
}
