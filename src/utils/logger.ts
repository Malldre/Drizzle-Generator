import * as winston from "winston";

/**
 * Winston logger configured for library debug output.
 */
const logger = winston.createLogger({
	level: "info",
	format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
	transports: [
		new winston.transports.Console({
			format: winston.format.printf((info) => `[DrizzleGen: ${info.level}]: ${info.message}`),
		}),
	],
	exitOnError: false,
});

export default logger;
