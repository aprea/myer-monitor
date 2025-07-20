export const apps = [
	{
		name: 'myer-monitor-shoes',
		script: 'index.ts',
		args: '-q shoes',
		interpreter: 'bun',
		env: {
			NODE_ENV: 'production',
			PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
		},
		error_file: './logs/error.log',
		out_file: './logs/out.log',
		log_file: './logs/combined.log',
	},
	{
		name: 'myer-monitor-pokemon',
		script: 'index.ts',
		args: '-q tcg',
		interpreter: 'bun',
		env: {
			NODE_ENV: 'production',
			PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
		},
		error_file: './logs/error.log',
		out_file: './logs/out.log',
		log_file: './logs/combined.log',
	},
];
