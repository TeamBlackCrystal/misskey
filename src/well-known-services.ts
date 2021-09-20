export const wellKnownServices = [
	['twitter.com', username => `https://twitter.com/${username}`],
	['github.com', username => `https://github.com/${username}`],
	['gitlab.com', username => `https://gitlab.com/${username}`],
] as [string, (username: string) => string][];
