import americano from '../assets/products/americano.jpg';
import brownies from '../assets/products/brownies.jpg';
import cappuccino from '../assets/products/cappuccino.jpg';
import cheesecake from '../assets/products/cheesecake.jpg';
import coldBrew from '../assets/products/cold-brew.jpg';
import cookies from '../assets/products/cookies.jpg';
import croissant from '../assets/products/croissant.jpg';
import donuts from '../assets/products/donuts.jpg';
import espresso from '../assets/products/espresso.jpg';
import flatWhite from '../assets/products/flat-white.jpg';
import frappuccino from '../assets/products/frappuccino.jpg';
import hotChocolate from '../assets/products/hot-chocolate.jpg';
import icedAmericano from '../assets/products/iced-americano.jpg';
import icedLatte from '../assets/products/iced-latte.jpg';
import icedMatcha from '../assets/products/iced-matcha.jpg';
import icedMocha from '../assets/products/iced-mocha.jpg';
import latte from '../assets/products/latte.jpg';
import mocha from '../assets/products/mocha.jpg';
import muffin from '../assets/products/muffin.jpg';

const ASSET_PREFIX = 'qahwa-asset:';

const PRODUCT_IMAGES: Record<string, string> = {
  americano,
  brownies,
  cappuccino,
  cheesecake,
  'cold-brew': coldBrew,
  cookies,
  croissant,
  donuts,
  espresso,
  'flat-white': flatWhite,
  frappuccino,
  'hot-chocolate': hotChocolate,
  'iced-americano': icedAmericano,
  'iced-latte': icedLatte,
  'iced-matcha': icedMatcha,
  'iced-mocha': icedMocha,
  latte,
  mocha,
  muffin,
};

/**
 * Menu rows store either a real URL or a bundled `qahwa-asset:<key>` marker.
 * Bundled assets keep working offline and are covered by the `img-src 'self'`
 * CSP, unlike arbitrary remote URLs.
 */
export function resolveImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(ASSET_PREFIX)) return value;
  return PRODUCT_IMAGES[value.slice(ASSET_PREFIX.length)] ?? null;
}
