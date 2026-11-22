declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				username: string;
				avatar: string | null;
				guildsCount: number;
			} | null;
		}
	}
}

export {};
