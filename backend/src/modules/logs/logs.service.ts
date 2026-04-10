import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import {WinstonLoggerService} from '../../integrations/logger/winston-logger.service';

const MAX_LINES = 10_000;
const DEFAULT_LIMIT = 500;

// Interface for LogsService
interface ILogsService {
    // Find all files in the logs directory
    listFiles(): Promise<{ name: string; size: number }[]>;

    // Read a log file and return string array of lines
    readLogFile(
        name: string,
        offset: number,
        limit: number,
        level?: string,
    ): Promise<{
        lines: string[];
        totalLines: number;
        offset: number;
        limit: number;
    }>;
}

@Injectable()
export class LogsService implements ILogsService {
    constructor(private readonly winston: WinstonLoggerService) {
    }

    // Helper function to check if a file name is allowed
    isAllowedLogFileName(name: string): boolean {
        return /^[a-zA-Z0-9._-]+\.log$/.test(name);
    }

    // Find all files in the logs directory
    async listFiles(): Promise<{ name: string; size: number }[]> {
        // Getting winston's root directory
        const dir = this.winston.rootDir;
        // Getting all files in the directory
        const entries = await fs.readdir(dir, {withFileTypes: true});

        // Filtering only log files
        const files = entries.filter((e) => e.isFile() && e.name.endsWith('.log'));

        // Getting file sizes
        const out: { name: string; size: number }[] = [];

        for (const f of files) {
            // Getting file stats
            const stat = await fs.stat(path.join(dir, f.name));

            // Pushing file name and size to the output array
            out.push({name: f.name, size: stat.size});
        }

        // Returning sorted by name files
        return out.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Read a log file and return string array of lines
    async readLogFile(
        name: string,
        offset = 0,
        limit = DEFAULT_LIMIT,
        level?: string,
    ): Promise<{
        lines: string[];
        totalLines: number;
        offset: number;
        limit: number;
    }> {
        if (!this.isAllowedLogFileName(name)) {
            throw new BadRequestException('Invalid log file name');
        }

        // Getting winston's root directory
        const root = path.resolve(this.winston.rootDir);

        // Getting full path to the log file
        const full = path.resolve(root, name);

        // Normalizing root path to ensure it ends with a separator
        const normalizedRoot = root.endsWith(path.sep) ? root : root + path.sep;

        if (full !== root && !full.startsWith(normalizedRoot)) {
            throw new ForbiddenException();
        }

        let content: string;
        try {
            // Reading the log file
            content = await fs.readFile(full, 'utf8');
        } catch {
            throw new NotFoundException('Log file not found');
        }

        // Formatting log file content to string array
        let lines = content.split(/\r?\n/).filter((l) => l.length > 0);

        if (level) {
            const needle = `"level":"${level}"`;

            // Filtering log lines based on the level
            lines = lines.filter(
                (l) =>
                    l.includes(needle) || l.includes(`"level":"${level.toLowerCase()}"`),
            );
        }

        const totalLines = lines.length;
        const safeOffset = Math.max(0, offset);
        const safeLimit = Math.min(Math.max(1, limit), MAX_LINES);

        const slice = lines.slice(safeOffset, safeOffset + safeLimit);

        return {lines: slice, totalLines, offset: safeOffset, limit: safeLimit};
    }
}
