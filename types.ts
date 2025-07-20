export interface SearchResponse {
	facetList: FacetList[];
	isSuggestion: boolean;
	offset: number;
	originalSearchTerm: string;
	productList: Product[];
	productRecommendations: ProductRecommendations;
	productsPerPage: number;
	productTotalCount: number;
	responseId: string;
	searchpass: string;
	searchTerm: string;
	sort: string;
}

export interface FacetList {
	facetCode: string;
	facetResultList?: FacetResultList[];
	facetTitle: string;
	globalRange?: GlobalRange;
	identifier: string;
	multiselect: boolean;
	myerIdentifier?: string;
}

export interface FacetResultList {
	applicable: boolean;
	facetCount: number;
	facetLabel: string;
	facetValue: string;
	selected: boolean;
}

export interface GlobalRange {
	max: number;
	min: number;
}

export interface Product {
	brand: string;
	hasMoreColours: boolean;
	id: string;
	isAvailable: boolean;
	isBuyable: boolean;
	listPriceFrom: number;
	listPriceTo: number;
	media: Medum[];
	merchCategory: string;
	mfPartNumber?: string;
	name: string;
	priceFrom: number;
	priceTo: number;
	productExclusive?: string;
	savedAmountFrom?: number;
	savedAmountTo?: number;
	seoToken: string;
	supplierColour: string;
	variantData: VariantDaum[];
}

export interface VariantDaum {
	colour: string;
	id: string;
}

export interface Medum {
	baseUrl: string;
	description: string;
	sequence: string;
	type: string;
}

export interface ProductRecommendations {
	heading: string;
	productList: unknown[];
}
