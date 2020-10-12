/**
 * External dependencies
 */
import { TranslateResult } from 'i18n-calypso';
import { compact, isArray, isObject } from 'lodash';
import page from 'page';
import React, { createElement, Fragment } from 'react';

/**
 * Internal dependencies
 */
import { getFeatureByKey, getFeatureCategoryByKey } from 'calypso/lib/plans/features-list';
import {
	ALL,
	DAILY_PLAN_TO_REALTIME_PLAN,
	DAILY_PRODUCTS,
	EXTERNAL_PRODUCTS_LIST,
	EXTERNAL_PRODUCTS_SLUG_MAP,
	FEATURED_PRODUCTS,
	ITEM_TYPE_PRODUCT,
	ITEM_TYPE_BUNDLE,
	ITEM_TYPE_PLAN,
	OPTIONS_JETPACK_BACKUP,
	OPTIONS_JETPACK_BACKUP_MONTHLY,
	OPTIONS_JETPACK_SECURITY,
	OPTIONS_JETPACK_SECURITY_MONTHLY,
	OPTIONS_SLUG_MAP,
	PERFORMANCE,
	PLAN_COMPARISON_PAGE,
	PRODUCTS_WITH_OPTIONS,
	REALTIME_PRODUCTS,
	SECURITY,
	SUBTYPE_TO_OPTION,
	UPGRADEABLE_WITH_NUDGE,
	UPSELL_PRODUCT_MATRIX,
} from './constants';
import RecordsDetails from './records-details';
import { addItems } from 'calypso/lib/cart/actions';
import { jetpackProductItem } from 'calypso/lib/cart-values/cart-items';
import isJetpackCloud from 'calypso/lib/jetpack/is-jetpack-cloud';
import {
	TERM_ANNUALLY,
	TERM_MONTHLY,
	TERM_BIENNIALLY,
	JETPACK_LEGACY_PLANS,
	JETPACK_RESET_PLANS,
	JETPACK_SECURITY_PLANS,
	PLAN_JETPACK_COMPLETE,
	PLAN_JETPACK_COMPLETE_MONTHLY,
	PLAN_JETPACK_SECURITY_DAILY,
	PLAN_JETPACK_SECURITY_DAILY_MONTHLY,
	PLAN_JETPACK_SECURITY_REALTIME,
	PLAN_JETPACK_SECURITY_REALTIME_MONTHLY,
} from 'calypso/lib/plans/constants';
import {
	getPlan,
	getMonthlyPlanByYearly,
	getYearlyPlanByMonthly,
	planHasFeature,
} from 'calypso/lib/plans';
import {
	JETPACK_BACKUP_PRODUCTS,
	JETPACK_PRODUCT_PRICE_MATRIX,
	JETPACK_SEARCH_PRODUCTS,
	PRODUCT_JETPACK_ANTI_SPAM,
	PRODUCT_JETPACK_ANTI_SPAM_MONTHLY,
	PRODUCT_JETPACK_CRM,
	PRODUCT_JETPACK_CRM_MONTHLY,
	PRODUCT_JETPACK_SCAN,
	PRODUCT_JETPACK_SCAN_MONTHLY,
} from 'calypso/lib/products-values/constants';
import {
	Product,
	JETPACK_PRODUCTS_LIST,
	objectIsProduct,
	PRODUCTS_LIST,
} from 'calypso/lib/products-values/products-list';
import { addQueryArgs } from 'calypso/lib/route';

/**
 * Type dependencies
 */
import type {
	Duration,
	SelectorProduct,
	SelectorProductCopy,
	SelectorProductSlug,
	DurationString,
	SelectorProductFeaturesItem,
	SelectorProductFeaturesSection,
	QueryArgs,
} from './types';
import type {
	JetpackRealtimePlan,
	JetpackPlanSlugs,
	Plan,
	JetpackPlanCardFeature,
	JetpackPlanCardFeatureSection,
} from 'calypso/lib/plans/types';
import type { JetpackProductSlug } from 'calypso/lib/products-values/types';
import type { SitePlan } from 'calypso/state/sites/selectors/get-site-plan';

/**
 * Duration utils.
 */

export function stringToDuration( duration?: string ): Duration | undefined {
	if ( duration === undefined ) {
		return undefined;
	}
	if ( duration === 'monthly' ) {
		return TERM_MONTHLY;
	}
	return TERM_ANNUALLY;
}

export function stringToDurationString( duration?: string ): DurationString {
	return duration !== 'monthly' ? 'annual' : 'monthly';
}

export function durationToString( duration: Duration ): DurationString {
	return duration === TERM_MONTHLY ? 'monthly' : 'annual';
}

export function durationToText( duration: Duration, translateFn: Function ): TranslateResult {
	return duration === TERM_MONTHLY
		? translateFn( 'per month, billed monthly' )
		: translateFn( 'per month, billed yearly' );
}

/**
 * Product UI utils.
 */

export function productButtonLabel(
	product: SelectorProduct,
	isOwned: boolean,
	isUpgradeableToYearly: boolean,
	translateFn: Function,
	currentPlan?: SitePlan | null
): TranslateResult {
	if ( isUpgradeableToYearly ) {
		return translateFn( 'Upgrade to Yearly' );
	}

	if (
		isOwned ||
		( currentPlan && planHasFeature( currentPlan.product_slug, product.productSlug ) )
	) {
		return product.type !== ITEM_TYPE_PRODUCT
			? translateFn( 'Manage Plan' )
			: translateFn( 'Manage Subscription' );
	}

	const { buttonLabel, displayName } = getSelectorProductCopy( product.productSlug, translateFn );

	return (
		buttonLabel ??
		translateFn( 'Get {{name/}}', {
			components: {
				name: createElement( Fragment, {}, displayName ),
			},
			comment: '{{name/}} is the name of a product',
		} )
	);
}

export function slugIsFeaturedProduct( productSlug: string ): boolean {
	return FEATURED_PRODUCTS.includes( productSlug );
}

export function productBadgeLabel(
	product: SelectorProduct,
	isOwned: boolean,
	highlight: boolean,
	translateFn: Function,
	currentPlan?: SitePlan | null
): TranslateResult | undefined {
	if ( isOwned ) {
		return slugIsJetpackPlanSlug( product.productSlug )
			? translateFn( 'Your plan' )
			: translateFn( 'You own this' );
	}

	if ( currentPlan && planHasFeature( currentPlan.product_slug, product.productSlug ) ) {
		return translateFn( 'Included in your plan' );
	}

	if ( highlight && slugIsFeaturedProduct( product.productSlug ) ) {
		return translateFn( 'Best Value' );
	}
}

export function getMoreFeaturesLink( productSlug: string, translateFn: Function ) {
	switch ( productSlug ) {
		case OPTIONS_JETPACK_SECURITY:
		case OPTIONS_JETPACK_SECURITY_MONTHLY:
		case PLAN_JETPACK_SECURITY_DAILY:
		case PLAN_JETPACK_SECURITY_DAILY_MONTHLY:
		case PLAN_JETPACK_SECURITY_REALTIME:
		case PLAN_JETPACK_SECURITY_REALTIME_MONTHLY:
		case PLAN_JETPACK_COMPLETE:
		case PLAN_JETPACK_COMPLETE_MONTHLY:
			return {
				url: PLAN_COMPARISON_PAGE,
				label: translateFn( 'See all features' ),
			};
		default:
			return undefined;
	}
}

export function getProductTypeOptions( translateFn: Function ) {
	return {
		[ SECURITY ]: {
			id: SECURITY,
			label: translateFn( 'Security' ),
		},
		[ PERFORMANCE ]: {
			id: PERFORMANCE,
			label: translateFn( 'Performance' ),
		},
		[ ALL ]: {
			id: ALL,
			label: translateFn( 'All' ),
		},
	};
}

export function getSelectorProductCopy(
	productSlug: string,
	translateFn: Function
): SelectorProductCopy {
	const securityCopy = {
		displayName: translateFn( 'Jetpack Security' ),
		shortName: translateFn( 'Security', {
			comment: 'Short name of the Jetpack Security generic plan',
		} ),
		tagline: translateFn( 'Comprehensive WordPress protection' ),
		description: translateFn(
			'Enjoy the peace of mind of complete site security. ' +
				'Easy-to-use, powerful security tools guard your site, so you can focus on your business.'
		),
	};

	const backupCopy = {
		displayName: translateFn( 'Jetpack Backup' ),
		shortName: translateFn( 'Backup', {
			comment: 'Short name of the Jetpack Backup generic product',
		} ),
		tagline: translateFn( 'Recommended for all sites' ),
		description: translateFn( 'Never lose a word, image, page, or time worrying about your site.' ),
		buttonLabel: translateFn( 'Get Backup' ),
	};

	const crmCopy = {
		displayName: translateFn( 'Jetpack CRM' ),
		shortName: translateFn( 'CRM', {
			comment: 'Short name of the Jetpack CRM',
		} ),
		tagline: translateFn( 'Manage contacts effortlessly' ),
		description: translateFn(
			'The most simple and powerful WordPress CRM. Improve customer relationships and increase profits.'
		),
		buttonLabel: translateFn( 'Get CRM' ),
	};

	const completeCopy = {
		displayName: translateFn( 'Jetpack Complete' ),
		shortName: translateFn( 'Complete', {
			comment: 'Short name of Jetpack Complete',
		} ),
		tagline: translateFn( 'For best-in-class WordPress sites' ),
		description: translateFn(
			'Superpower your site with everything Jetpack has to offer: real-time security, enhanced search, CRM, and marketing, growth, and design tools.'
		),
		buttonLabel: translateFn( 'Get Jetpack Complete' ),
	};

	const scanCopy = {
		displayName: translateFn( 'Jetpack Scan' ),
		shortName: translateFn( 'Scan', {
			comment: 'Short name of Jetpack Scan',
		} ),
		tagline: translateFn( 'Protect your site' ),
		description: translateFn(
			'Automatic scanning and one-click fixes keep your site one step ahead of security threats.'
		),
		buttonLabel: translateFn( 'Get Scan' ),
	};

	const antiSpamCopy = {
		displayName: translateFn( 'Jetpack Anti-spam' ),
		shortName: translateFn( 'Anti-spam', {
			comment: 'Short name of Jetpack Anti-spam',
		} ),
		tagline: translateFn( 'Block spam automatically' ),
		description: translateFn(
			'Automated spam protection for comments and forms. Save time, get more responses, and give your visitors a better experience.'
		),
		buttonLabel: translateFn( 'Get Anti-spam' ),
	};

	switch ( productSlug ) {
		case OPTIONS_JETPACK_SECURITY:
		case OPTIONS_JETPACK_SECURITY_MONTHLY:
			return securityCopy;
		case OPTIONS_JETPACK_BACKUP:
		case OPTIONS_JETPACK_BACKUP_MONTHLY:
			return backupCopy;
		case PRODUCT_JETPACK_CRM:
		case PRODUCT_JETPACK_CRM_MONTHLY:
			return crmCopy;
		case PLAN_JETPACK_COMPLETE:
		case PLAN_JETPACK_COMPLETE_MONTHLY:
			return completeCopy;
		case PRODUCT_JETPACK_SCAN:
		case PRODUCT_JETPACK_SCAN_MONTHLY:
			return scanCopy;
		case PRODUCT_JETPACK_ANTI_SPAM:
		case PRODUCT_JETPACK_ANTI_SPAM_MONTHLY:
			return antiSpamCopy;
		default:
			throw `Unknown SelectorProductSlug: ${ productSlug }`;
	}
}

export function productBadgeLabelAlt(
	product: SelectorProduct,
	isOwned: boolean,
	currentPlan?: SitePlan | null
): TranslateResult | undefined {
	if ( isOwned ) {
		return translate( 'You own this' );
	}

	if ( currentPlan && planHasFeature( currentPlan.product_slug, product.productSlug ) ) {
		return translate( 'Included in your plan' );
	}
}

/**
 * Type guards.
 */

function slugIsSelectorProductSlug( slug: string ): slug is SelectorProductSlug {
	return PRODUCTS_WITH_OPTIONS.includes( slug as typeof PRODUCTS_WITH_OPTIONS[ number ] );
}
function slugIsJetpackProductSlug( slug: string ): slug is JetpackProductSlug {
	return slug in JETPACK_PRODUCTS_LIST;
}
function slugIsJetpackPlanSlug( slug: string ): slug is JetpackPlanSlugs {
	return [ ...JETPACK_LEGACY_PLANS, ...JETPACK_RESET_PLANS ].includes( slug );
}

/**
 * Product parsing and data normalization utils.
 */

export function slugToItem( slug: string ): Plan | Product | SelectorProduct | null {
	if ( slugIsSelectorProductSlug( slug ) ) {
		return OPTIONS_SLUG_MAP[ slug ];
	} else if ( EXTERNAL_PRODUCTS_LIST.includes( slug ) ) {
		return EXTERNAL_PRODUCTS_SLUG_MAP[ slug ];
	} else if ( slugIsJetpackProductSlug( slug ) ) {
		return JETPACK_PRODUCTS_LIST[ slug ];
	} else if ( slugIsJetpackPlanSlug( slug ) ) {
		return getPlan( slug ) as Plan;
	}
	return null;
}

function objectIsSelectorProduct(
	item: Record< string, unknown > | SelectorProduct
): item is SelectorProduct {
	const requiredKeys = [ 'productSlug', 'iconSlug', 'term' ];
	return requiredKeys.every( ( k ) => k in item );
}

function objectIsPlan( item: Record< string, unknown > | Plan ): item is Plan {
	const requiredKeys = [
		'group',
		'type',
		'term',
		'getBillingTimeFrame',
		'getTitle',
		'getDescription',
		'getProductId',
		'getStoreSlug',
	];
	return requiredKeys.every( ( k ) => k in item );
}

/**
 * Converts data from a product, plan, or selector product to selector product.
 *
 * @param item Product, Plan, or SelectorProduct.
 * @returns SelectorProduct
 */
export function itemToSelectorProduct(
	item: Plan | Product | SelectorProduct | Record< string, unknown >
): SelectorProduct | null {
	if ( objectIsSelectorProduct( item ) ) {
		return item;
	} else if ( objectIsProduct( item ) ) {
		let monthlyProductSlug;
		let yearlyProductSlug;
		if (
			item.term === TERM_ANNUALLY &&
			Object.keys( JETPACK_PRODUCT_PRICE_MATRIX ).includes( item.product_slug )
		) {
			monthlyProductSlug =
				JETPACK_PRODUCT_PRICE_MATRIX[
					item.product_slug as keyof typeof JETPACK_PRODUCT_PRICE_MATRIX
				].relatedProduct;
		} else if ( item.term === TERM_MONTHLY ) {
			yearlyProductSlug = PRODUCTS_LIST[ item.product_slug as JetpackProductSlug ].type;
		}
		return {
			productSlug: item.product_slug,
			// Using the same slug for any duration helps prevent unnecessary DOM updates
			iconSlug: `${ yearlyProductSlug || item.product_slug }_v2`,
			type: ITEM_TYPE_PRODUCT,
			subtypes: [],
			children: JETPACK_SEARCH_PRODUCTS.includes( item.product_slug )
				? createElement( RecordsDetails, { productSlug: item.product_slug } )
				: undefined,
			monthlyProductSlug,
			term: item.term,
			hidePrice: JETPACK_SEARCH_PRODUCTS.includes( item.product_slug ),
			features: {
				items: item.features
					? buildCardFeaturesFromItem( item.features, {
							withoutDescription: true,
							withoutIcon: true,
					  } )
					: [],
			},
		};
	} else if ( objectIsPlan( item ) ) {
		const productSlug = item.getStoreSlug();
		let monthlyProductSlug;
		let yearlyProductSlug;
		if ( item.term === TERM_ANNUALLY ) {
			monthlyProductSlug = getMonthlyPlanByYearly( productSlug );
		} else if ( item.term === TERM_MONTHLY ) {
			yearlyProductSlug = getYearlyPlanByMonthly( productSlug );
		}
		const isResetPlan = JETPACK_RESET_PLANS.includes( productSlug );
		const iconAppend = isResetPlan ? '_v2' : '';
		const type = JETPACK_SECURITY_PLANS.includes( productSlug ) ? ITEM_TYPE_BUNDLE : ITEM_TYPE_PLAN;
		return {
			productSlug,
			// Using the same slug for any duration helps prevent unnecessary DOM updates
			iconSlug: ( yearlyProductSlug || productSlug ) + iconAppend,
			type,
			subtypes: [],
			monthlyProductSlug,
			term: item.term === TERM_BIENNIALLY ? TERM_ANNUALLY : item.term,
			features: {
				items: buildCardFeaturesFromItem( item ),
			},
			legacy: ! isResetPlan,
		};
	}
	return null;
}

/**
 * Feature utils.
 */

/**
 * Builds the feature item of a product card, from a feature key.
 *
 * @param {JetpackPlanCardFeature} featureKey Key of the feature
 * @param {object?} options Options
 * @param {string?} options.withoutDescription Whether to build the card with a description
 * @param {string?} options.withoutIcon Whether to build the card with an icon
 * @returns {SelectorProductFeaturesItem} Feature item
 */
export function buildCardFeatureItemFromFeatureKey(
	featureKey: JetpackPlanCardFeature,
	options?: { withoutDescription?: boolean; withoutIcon?: boolean }
): SelectorProductFeaturesItem | undefined {
	let feature;
	let subFeaturesKeys;

	if ( isArray( featureKey ) ) {
		const [ key, subKeys ] = featureKey;

		feature = getFeatureByKey( key );
		subFeaturesKeys = subKeys;
	} else {
		feature = getFeatureByKey( featureKey );
	}

	if ( feature ) {
		return {
			icon: options?.withoutIcon ? undefined : feature.getIcon?.(),
			text: feature.getTitle(),
			description: options?.withoutDescription ? undefined : feature.getDescription?.(),
			subitems: subFeaturesKeys
				? compact(
						subFeaturesKeys.map( ( f ) => buildCardFeatureItemFromFeatureKey( f, options ) )
				  )
				: undefined,
		};
	}
}

/**
 * Builds the feature items passed to the product card, from feature keys.
 *
 * @param {JetpackPlanCardFeature[] | JetpackPlanCardFeatureSection} features Feature keys
 * @param {object?} options Options
 * @returns {SelectorProductFeaturesItem[] | SelectorProductFeaturesSection[]} Features
 */
export function buildCardFeaturesFromFeatureKeys(
	features: JetpackPlanCardFeature[] | JetpackPlanCardFeatureSection,
	options?: Record< string, unknown >
): SelectorProductFeaturesItem[] | SelectorProductFeaturesSection[] {
	// Without sections (JetpackPlanCardFeature[])
	if ( isArray( features ) ) {
		return compact( features.map( ( f ) => buildCardFeatureItemFromFeatureKey( f, options ) ) );
	}

	// With sections (JetpackPlanCardFeatureSection)
	if ( isObject( features ) ) {
		const result = [] as SelectorProductFeaturesSection[];

		Object.getOwnPropertySymbols( features ).map( ( key ) => {
			const category = getFeatureCategoryByKey( key );
			const subfeatures = features[ key ];

			if ( category ) {
				result.push( {
					heading: category.getTitle(),
					list: subfeatures.map( ( f: JetpackPlanCardFeature ) =>
						buildCardFeatureItemFromFeatureKey( f, options )
					),
				} as SelectorProductFeaturesSection );
			}
		} );

		return result;
	}

	return [];
}

/**
 * Builds the feature items passed to the product card, from a plan, product, or object.
 *
 * @param {Plan | Product | object} item Product, plan, or object
 * @param {object?} options Options
 * @returns {SelectorProductFeaturesItem[] | SelectorProductFeaturesSection[]} Features
 */
export function buildCardFeaturesFromItem(
	item: Plan | Product | Record< string, unknown >,
	options?: Record< string, unknown >
): SelectorProductFeaturesItem[] | SelectorProductFeaturesSection[] {
	if ( objectIsPlan( item ) ) {
		const features = item.getPlanCardFeatures?.();

		if ( features ) {
			return buildCardFeaturesFromFeatureKeys( features, options );
		}
	}

	return buildCardFeaturesFromFeatureKeys( item, options );
}

/**
 * Converts an item slug to a SelectorProduct item type.
 *
 * @param slug string
 * @returns SelectorProduct | null
 */
export function slugToSelectorProduct( slug: string ): SelectorProduct | null {
	const item = slugToItem( slug );
	if ( ! item ) {
		return null;
	}
	return itemToSelectorProduct( item );
}

/**
 * Returns an item slug that represents the real-time version of a daily one.
 *
 * @param slug string
 * @returns string | null
 */
export function getRealtimeFromDaily( slug: string ): JetpackRealtimePlan | null {
	return DAILY_PLAN_TO_REALTIME_PLAN[ slug ];
}

/**
 * Returns whether an item is upgradeable by a nudge.
 *
 * @param slug string
 * @returns boolean | null
 */
export function isUpgradeable( slug: string ): boolean {
	return UPGRADEABLE_WITH_NUDGE.includes( slug );
}

/**
 * Returns an upsell product, if any, for the slug.
 *
 * @param slug string
 * @returns boolean | null
 */
export function getProductUpsell( slug: string ): string | null {
	return UPSELL_PRODUCT_MATRIX[ slug ];
}

/**
 * Returns the slug of an option product given a real product/plan slug.
 *
 * @param slug string
 * @returns string | null
 */
export function getOptionFromSlug( slug: string ): string | null {
	return SUBTYPE_TO_OPTION[ slug ];
}

/**
 * Returns all options, both yearly and monthly, given a slug. If the slug
 * has no related to option, it returns an empty array.
 * e.g. jetpack_security_daily -> [ jetpack_security_monthly, jetpack_security ]
 * e.g. jetpack_scan -> []
 *
 * @param slug string
 * @returns string[]
 */
export function getAllOptionsFromSlug( slug: string ): string[] {
	if ( JETPACK_BACKUP_PRODUCTS.includes( slug ) ) {
		return [ OPTIONS_JETPACK_BACKUP, OPTIONS_JETPACK_BACKUP_MONTHLY ];
	}

	if ( JETPACK_SECURITY_PLANS.includes( slug ) ) {
		return [ OPTIONS_JETPACK_SECURITY, OPTIONS_JETPACK_SECURITY_MONTHLY ];
	}

	return [];
}

/**
 * Adds products to the cart and redirects to the checkout page.
 *
 * @param {string} siteSlug Selected site
 * @param {string | string[]} products Slugs of the products to add to the cart
 * @param {QueryArgs} urlQueryArgs Additional query params appended to url (ie. for affiliate tracking, or whatever)
 */
export function checkout(
	siteSlug: string,
	products: string | string[],
	urlQueryArgs: QueryArgs
): void {
	const productsArray = isArray( products ) ? products : [ products ];

	// There is not siteSlug, we need to redirect the user to the site selection
	// step of the flow. Since purchases of multiple products are allowed, we need
	// to pass all products separated by comma in the URL.
	const path = siteSlug
		? `/checkout/${ siteSlug }/${ isJetpackCloud() ? productsArray.join( ',' ) : '' }`
		: `/jetpack/connect/${ productsArray.join( ',' ) }`;

	if ( isJetpackCloud() ) {
		window.location.href = addQueryArgs( urlQueryArgs, `https://wordpress.com${ path }` );
	} else {
		addItems( productsArray.map( jetpackProductItem ) );
		page.redirect( addQueryArgs( urlQueryArgs, path ) );
	}
}

/**
 * Returns a URL of the format `rootUrl/?duration/?siteSlug`. In most cases, `rootUrl` will
 * be either '/jetpack/connect/plans' or '/plans'. The result will most likely look like
 * '/plans/monthly/site-slug', '/plans/site-slug', or just '/plans'.
 *
 * @param {string} rootUrl Base URL that relates to the current flow (WordPress.com vs Jetpack Connect).
 * @param {QueryArgs} urlQueryArgs URL query params appended to url (ie. for affiliate tracking, or whatever), or {} if none.
 * @param {Duration} duration Monthly or annual
 * @param {string} siteSlug (optional) The slug of the selected site
 *
 * @returns {string} The path to the Selector page
 */
export function getPathToSelector(
	rootUrl: string,
	urlQueryArgs: QueryArgs,
	duration?: Duration,
	siteSlug?: string
): string {
	const strDuration = duration ? durationToString( duration ) : null;
	const path = [ rootUrl, strDuration, siteSlug ].filter( Boolean ).join( '/' );

	return addQueryArgs( urlQueryArgs, path );
}

/**
 * Returns a URL of the format `rootUrl/productSlug/duration/details/?siteSlug` that
 * points to the Details page.
 *
 * @param {string} rootUrl Base URL that relates to the current flow (WordPress.com vs Jetpack Connect).
 * @param {QueryArgs} urlQueryArgs URL query params appended to url (ie. for affiliate tracking, or whatever), or {} if none.
 * @param {string} productSlug Slug of the product
 * @param {Duration} duration Monthly or annual
 * @param {string} siteSlug (optional) The slug of the selected site
 *
 * @returns {string} The path to the Details page
 */
export function getPathToDetails(
	rootUrl: string,
	urlQueryArgs: QueryArgs,
	productSlug: string,
	duration: Duration,
	siteSlug?: string
): string {
	const strDuration = durationToString( duration );
	const path = [ rootUrl, productSlug, strDuration, 'details', siteSlug ]
		.filter( Boolean )
		.join( '/' );

	return addQueryArgs( urlQueryArgs, path );
}

/**
 * Returns a URL of the format `rootUrl/productSlug/duration/additions/?siteSlug` that
 * points to the Upsell page.
 *
 * @param {string} rootUrl Base URL that relates to the current flow (WordPress.com vs Jetpack Connect).
 * @param {QueryArgs} urlQueryArgs URL query params appended to url (ie. for affiliate tracking, or whatever), or {} if none.
 * @param {string} productSlug Slug of the product
 * @param {Duration} duration Monthly or annual
 * @param {string} siteSlug (optional) The slug of the selected site
 *
 * @returns {string} The path to the Upsell page
 */
export function getPathToUpsell(
	rootUrl: string,
	urlQueryArgs: QueryArgs,
	productSlug: string,
	duration: Duration,
	siteSlug?: string
): string {
	const strDuration = durationToString( duration );
	const path = [ rootUrl, productSlug, strDuration, 'additions', siteSlug ]
		.filter( Boolean )
		.join( '/' );

	return addQueryArgs( urlQueryArgs, path );
}

/**
 * Append "Available Options: Real-time and Daily" to the product description.
 *
 * @param product SelectorProduct
 * @param translateFn Function The translate function, ideally retrieved from useTranslate().
 *
 * @returns ReactNode | TranslateResult
 */
export const getJetpackDescriptionWithOptions = (
	product: SelectorProduct,
	translateFn: Function
): React.ReactNode | TranslateResult => {
	const em = React.createElement( 'em', null, null );

	const { description } = getSelectorProductCopy( product.productSlug, translateFn );

	// If the product has 'subtypes' (containing daily and real-time product slugs).
	// then append "Available options: Real-time or Daily" to the product description.
	return product.subtypes.some( ( subtype ) => DAILY_PRODUCTS.includes( subtype ) ) &&
		product.subtypes.some( ( subtype ) => REALTIME_PRODUCTS.includes( subtype ) )
		? translateFn( '%(productDescription)s {{em}}Available options: Real-time or Daily.{{/em}}', {
				args: {
					productDescription: description,
				},
				components: {
					em,
				},
		  } )
		: description;
};
