import cron from 'node-cron';
import {
	Client,
	Events,
	GatewayIntentBits,
	TextChannel,
	EmbedBuilder,
} from 'discord.js';
import { sql } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import type { NewProduct } from './src/db/schema.ts';
import { productsTable } from './src/db/schema.ts';
import type { SearchResponse, Product } from './types.ts';
import { parseArgs } from 'util';

const { values: args } = parseArgs({
	args: Bun.argv,
	options: {
		seed: {
			type: 'boolean',
			short: 's',
			default: false,
		},
		'search-query': {
			type: 'string',
			short: 'q',
			default: '',
		},
		filter: {
			type: 'string',
			short: 'f',
		},
	},
	strict: true,
	allowPositionals: true,
});

const isSeedMode = args.seed;
const searchQuery = args['search-query'];
const filter = args.filter;

if (searchQuery == null || searchQuery === '') {
	throw new Error(
		'Search query is required. Use --search-query or -q to specify it.'
	);
}

let discordClient: Client;
let discordChannel: TextChannel | null = null;

if (!isSeedMode) {
	discordClient = new Client({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
	});

	discordClient.login(process.env.DISCORD_BOT_SECRET);

	discordClient.once(Events.ClientReady, () => {
		console.log('Discord bot is ready!');
		// Get channel by ID
		const channel = discordClient.channels.cache.get('1396042287439675392');

		if (channel instanceof TextChannel) {
			discordChannel = channel;
			console.log('Discord channel connected');

			// Schedule the monitoring task to run every minute
			const task = cron.schedule('* * * * *', monitorProducts, {
				noOverlap: true,
			});

			console.log('Running initial check...');
			task.execute();
		} else {
			console.error('Discord channel not found');
		}
	});
}

// Get all processed listing IDs from database
async function getProducts() {
	const products = await db.select().from(productsTable);

	return new Map(products.map((product) => [product.itemId, product]));
}

// Send Discord notification
async function sendDiscordNotification(product: Product) {
	if (!discordChannel) {
		console.error('Discord channel not available');
		return;
	}

	const embed = new EmbedBuilder()
		.setTitle(product.name)
		.setURL(`https://www.myer.com.au/p/${product.seoToken}`)
		.setColor(0x0099ff)
		.addFields({
			name: 'Price',
			value:
				product.priceFrom !== product.priceTo
					? `$${product.priceFrom} - $${product.priceTo}`
					: `$${product.priceFrom}`,
			inline: true,
		})
		.setTimestamp();

	// Add thumbnail image if available
	if (product.media[0] != null) {
		embed.setThumbnail(
			`https://myer-media.com.au/wcsstore/MyerCatalogAssetStore/${product.media[0].baseUrl.replace('{{size}}', '720x928')}`
		);
	}

	await discordChannel.send({ embeds: [embed] });
}

async function monitorProducts() {
	const existingProducts = await getProducts();

	try {
		const response = await fetch(
			`https://api-online.myer.com.au/v3/product/search?query=${searchQuery}&pageNumber=1&facets=&sort=recentlyAdded&variants=`,
			{
				headers: {
					accept: 'application/json',
					'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
					priority: 'u=1, i',
					'sec-ch-ua':
						'"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
					'sec-ch-ua-mobile': '?0',
					'sec-ch-ua-platform': '"macOS"',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-site',
				},
				referrer: 'https://www.myer.com.au/',
				body: null,
				method: 'GET',
				mode: 'cors',
				credentials: 'include',
				signal: AbortSignal.timeout(1000),
			}
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = (await response.json()) as SearchResponse;

		if (data.productList.length === 0) {
			console.log('No products found for the given search query.');
			return;
		}

		console.log(
			`Found ${data.productList.length} products for query "${searchQuery}".`
		);

		let products = data.productList;

		if (filter != null && filter !== '') {
			products = products.filter((product) =>
				product.name.toLowerCase().includes(filter.toLowerCase())
			);

			if (products.length > 0) {
				console.log(`Filtered down to ${products.length} products.`);
			}
		}

		if (products.length === 0) {
			console.log('No products found after applying the filter.');
			return;
		}

		let newProducts: NewProduct[] = [];

		const foundProductIds = new Set(products.map((product) => product.id));

		// Mark products found in search as in stock
		for (const product of products) {
			newProducts.push({
				itemId: product.id,
				inStock: true,
			});

			const existingProduct = existingProducts.get(product.id);
			const isExistingProductInStock = existingProduct?.inStock ?? false;

			if (!isSeedMode && !isExistingProductInStock) {
				console.log(
					`New product found or back in stock: ${product.name}`
				);

				sendDiscordNotification(product);
			}
		}

		// Mark products not found in search as out of stock
		for (const [itemId, existingProduct] of existingProducts.entries()) {
			if (!foundProductIds.has(itemId) && existingProduct.inStock) {
				newProducts.push({
					itemId,
					inStock: false,
				});
			}
		}

		await db
			.insert(productsTable)
			.values(newProducts)
			.onConflictDoUpdate({
				target: productsTable.itemId,
				set: {
					inStock: sql.raw(`excluded.${productsTable.inStock.name}`),
				},
			});
	} catch (error) {
		console.error('Error monitoring products:', error);
		return;
	}
}

// If in seed mode, run immediately
if (isSeedMode) {
	console.log('Running in seed mode - Discord notifications disabled');
	monitorProducts()
		.then(() => {
			console.log('Seeding complete');
			process.exitCode = 0;
		})
		.catch((error) => {
			console.error('Seeding failed:', error);
			process.exitCode = 1;
		});
}
