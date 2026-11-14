import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Clock,
  Coffee,
  Croissant,
  CupSoda,
  Facebook,
  Flame,
  Instagram,
  Leaf,
  MapPin,
  Music2,
  Phone,
  Plus,
  Quote,
  Sparkles,
  Star,
  Twitter,
} from 'lucide-react';
import { useMemo, type ReactElement, type ReactNode } from 'react';
import type { MenuItemDto, MenuKind } from '@pharmacy/shared';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import type { PageKey } from '../components/layout/AppShell';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { formatMoney, menuKindLabel } from '../lib/format';
import { resolveImageUrl } from '../lib/images';
import { cn } from '../lib/utils';
import qahwaLogo from '../assets/qahwa-logo.svg';
import heroImage from '../assets/storefront/hero.jpg';
import aboutImage from '../assets/storefront/about.jpg';
import cappuccinoImage from '../assets/products/cappuccino.jpg';
import coldImage from '../assets/products/iced-latte.jpg';
import croissantImage from '../assets/products/croissant.jpg';
import frappuccinoImage from '../assets/products/frappuccino.jpg';

const QUICK_ADD_KEY = 'qahwa-quick-add';
const QUICK_CATEGORY_KEY = 'qahwa-shop-category';
const BEST_SELLER_SKUS = ['HOT-CAPPUCCINO', 'COLD-ICED-LATTE', 'FOOD-CROISSANT', 'COLD-BREW'];

function startingPrice(item: MenuItemDto): number {
  if (item.hasSizes && item.sizes.length > 0) {
    return Math.min(...item.sizes.map((size) => Number(size.price)));
  }
  return Number(item.basePrice);
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  tone = 'light',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  tone?: 'light' | 'dark';
}): ReactElement {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl">
        <p
          className={cn(
            'flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em]',
            tone === 'dark' ? 'text-accent' : 'text-secondary',
          )}
        >
          <span className="h-px w-7 bg-current opacity-60" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2
          className={cn(
            'mt-3 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.05]',
            tone === 'dark' ? 'text-white' : 'text-foreground',
          )}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className={cn(
              'mt-2 max-w-lg text-sm leading-relaxed',
              tone === 'dark' ? 'text-white/55' : 'text-muted-foreground',
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function ProductCard({
  item,
  onAdd,
}: {
  item: MenuItemDto;
  onAdd: (item: MenuItemDto) => void;
}): ReactElement {
  const { t } = useI18n();
  const image = resolveImageUrl(item.imageUrl);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-soft">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-brand-cream text-secondary/50">
            <Coffee className="h-9 w-9" />
          </span>
        )}
        {item.isFeatured ? (
          <span className="absolute start-3 top-3 rounded-full bg-[#1b120c]/85 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
            {t('home.hero.badge')}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-secondary">
            {menuKindLabel(item.kind)}
          </p>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
            4.9
          </span>
        </div>
        <h3 className="mt-1.5 font-display text-[21px] leading-tight text-foreground">
          {item.name}
        </h3>
        {item.description ? (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <p className="numeric text-sm font-semibold text-foreground">
            {item.hasSizes
              ? t('home.menu.from', { price: formatMoney(startingPrice(item)) })
              : formatMoney(item.basePrice)}
          </p>
          <Button
            size="sm"
            className="rounded-full px-3"
            onClick={() => onAdd(item)}
            aria-label={`${t('home.featured.addToCart')} · ${item.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('home.featured.addToCart')}</span>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function HomePage({
  onNavigate,
}: {
  onNavigate: (page: PageKey) => void;
}): ReactElement {
  const { t } = useI18n();
  const catalog = useQuery({
    queryKey: ['pos', 'catalog'],
    queryFn: () => api.menu.catalog(),
    staleTime: 60_000,
  });

  const items = useMemo(() => catalog.data?.items ?? [], [catalog.data]);

  const featured = useMemo(() => {
    const picks = items.filter((item) => item.isFeatured && item.isAvailable).slice(0, 4);
    if (picks.length > 0) return picks;
    return items.filter((item) => item.isAvailable).slice(0, 4);
  }, [items]);

  const bestSellers = useMemo(() => {
    const picked: MenuItemDto[] = [];
    for (const sku of BEST_SELLER_SKUS) {
      const item = items.find((candidate) => candidate.sku === sku && candidate.isAvailable);
      if (item) picked.push(item);
    }
    for (const item of items) {
      if (picked.length >= 4) break;
      if (item.isAvailable && !picked.includes(item)) picked.push(item);
    }
    return picked.slice(0, 4);
  }, [items]);

  const categories = useMemo(
    () =>
      (
        [
          {
            kinds: ['HOT_DRINK'] as MenuKind[],
            titleKey: 'home.menu.hotDrinks' as const,
            image: cappuccinoImage,
          },
          {
            kinds: ['COLD_DRINK'] as MenuKind[],
            titleKey: 'home.menu.coldDrinks' as const,
            image: coldImage,
          },
          {
            kinds: ['BAKERY', 'DESSERT'] as MenuKind[],
            titleKey: 'home.menu.food' as const,
            image: croissantImage,
          },
        ] as const
      ).map((category) => {
        const matches = items.filter((item) => category.kinds.includes(item.kind));
        const categoryId = matches[0]?.categoryId ?? null;
        return {
          ...category,
          categoryId,
          count: categoryId
            ? items.filter((item) => item.categoryId === categoryId).length
            : matches.length,
        };
      }),
    [items],
  );

  const openCategory = (categoryId: string | null): void => {
    if (categoryId) sessionStorage.setItem(QUICK_CATEGORY_KEY, categoryId);
    onNavigate('pos');
  };

  const quickAdd = (item: MenuItemDto): void => {
    sessionStorage.setItem(QUICK_ADD_KEY, item.id);
    onNavigate('pos');
  };

  const scrollTo = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const offers = [
    {
      key: 'morning',
      titleKey: 'home.offers.items.morning.title' as const,
      descriptionKey: 'home.offers.items.morning.description' as const,
      priceKey: 'home.offers.items.morning.price' as const,
      oldPriceKey: 'home.offers.items.morning.oldPrice' as const,
      tagKey: 'home.offers.items.morning.tag' as const,
      image: croissantImage,
      icon: Croissant,
    },
    {
      key: 'cold',
      titleKey: 'home.offers.items.cold.title' as const,
      descriptionKey: 'home.offers.items.cold.description' as const,
      priceKey: 'home.offers.items.cold.price' as const,
      oldPriceKey: 'home.offers.items.cold.oldPrice' as const,
      tagKey: 'home.offers.items.cold.tag' as const,
      image: frappuccinoImage,
      icon: CupSoda,
    },
    {
      key: 'beans',
      titleKey: 'home.offers.items.beans.title' as const,
      descriptionKey: 'home.offers.items.beans.description' as const,
      priceKey: 'home.offers.items.beans.price' as const,
      oldPriceKey: 'home.offers.items.beans.oldPrice' as const,
      tagKey: 'home.offers.items.beans.tag' as const,
      image: aboutImage,
      icon: Coffee,
    },
  ];

  const reviews = [
    { key: 'one', quoteKey: 'home.reviews.items.one.quote' as const },
    { key: 'two', quoteKey: 'home.reviews.items.two.quote' as const },
    { key: 'three', quoteKey: 'home.reviews.items.three.quote' as const },
  ] as const;

  const socials = [
    { label: t('home.footer.social.instagram'), href: 'https://www.instagram.com/', icon: Instagram },
    { label: t('home.footer.social.facebook'), href: 'https://www.facebook.com/', icon: Facebook },
    { label: t('home.footer.social.tiktok'), href: 'https://www.tiktok.com/', icon: Music2 },
    { label: t('home.footer.social.x'), href: 'https://x.com/', icon: Twitter },
  ];

  return (
    <div className="space-y-14 pb-10 md:space-y-20">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#1a110b] text-white shadow-lift">
        <img
          src={heroImage}
          alt={t('home.hero.imageAlt')}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[52%_42%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#120b07]/95 via-[#120b07]/65 to-[#120b07]/15 rtl:bg-gradient-to-l"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[#120b07]/90 via-[#120b07]/10 to-[#120b07]/35"
        />

        <div className="relative flex min-h-[540px] flex-col justify-between px-6 py-8 sm:px-10 lg:min-h-[640px] lg:px-14 lg:py-12">
          <div className="flex items-start justify-between gap-4">
            <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              {t('home.hero.eyebrow')}
            </p>
            <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur sm:inline-flex">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              {t('home.hero.badge')}
            </span>
          </div>

          <div className="max-w-2xl py-12">
            <h1 className="hero-type text-balance text-[clamp(2.8rem,7vw,5.4rem)]">
              {t('home.hero.titleLine1')}
              <span className="mt-1 block">{t('home.hero.titleLine2')}</span>
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
              {t('home.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={() => onNavigate('pos')}
                className="h-12 rounded-full bg-accent px-7 text-[15px] font-semibold text-accent-foreground shadow-lg shadow-black/30 hover:bg-accent/90"
              >
                <Coffee className="h-4 w-4" />
                {t('home.hero.shopNow')}
                <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollTo('menu')}
                className="h-12 rounded-full border-white/25 bg-white/5 px-6 text-[15px] font-medium text-white backdrop-blur hover:border-white/40 hover:bg-white/10 hover:text-white"
              >
                {t('home.hero.exploreMenu')}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[11px] font-medium text-white/65">
            <span className="inline-flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-accent" />
              {t('home.hero.openHours')}
            </span>
            <span aria-hidden="true" className="hidden h-3 w-px bg-white/20 sm:block" />
            <span className="inline-flex items-center gap-2">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              {t('home.hero.rating')}
            </span>
            <span aria-hidden="true" className="hidden h-3 w-px bg-white/20 sm:block" />
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              {t('app.location')}
            </span>
          </div>
        </div>
      </section>

      <section id="menu" className="scroll-mt-24">
        <SectionHeading
          eyebrow={t('home.menu.eyebrow')}
          title={t('home.menu.title')}
          subtitle={t('home.menu.subtitle')}
          action={
            <Button variant="outline" className="rounded-full" onClick={() => onNavigate('pos')}>
              {t('home.featured.viewAll')}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Button>
          }
        />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <button
              key={category.titleKey}
              type="button"
              onClick={() => openCategory(category.categoryId)}
              className="group relative isolate h-52 overflow-hidden rounded-2xl bg-[#1a110b] text-start shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft"
            >
              <img
                src={category.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-t from-[#120b07]/90 via-[#120b07]/25 to-transparent"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                <span>
                  <span className="block font-display text-[24px] leading-tight text-white">
                    {t(category.titleKey)}
                  </span>
                  <span className="mt-1 block text-[11px] font-medium text-white/60">
                    {t('home.menu.items', { count: category.count })}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  {t('home.menu.browse')}
                  <ArrowRight className="h-3 w-3 rtl:-scale-x-100" />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow={t('home.featured.eyebrow')}
          title={t('home.featured.title')}
          subtitle={t('home.featured.subtitle')}
          action={
            <Button variant="outline" className="rounded-full" onClick={() => onNavigate('pos')}>
              {t('home.featured.viewAll')}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Button>
          }
        />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {catalog.isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                  aria-hidden="true"
                >
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))
            : featured.map((item) => <ProductCard key={item.id} item={item} onAdd={quickAdd} />)}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] bg-[#17100b] px-6 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,hsl(30_68%_46%/0.28),transparent_65%)]"
        />
        <div className="relative grid gap-8 lg:grid-cols-[0.85fr_1.4fr] lg:items-center lg:gap-14">
          <div>
            <SectionHeading
              eyebrow={t('home.bestSellers.eyebrow')}
              title={t('home.bestSellers.title')}
              subtitle={t('home.bestSellers.subtitle')}
              tone="dark"
            />
            <Button
              variant="outline"
              className="mt-6 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => onNavigate('pos')}
            >
              {t('home.bestSellers.viewAll')}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {bestSellers.map((item) => {
              const image = resolveImageUrl(item.imageUrl);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => quickAdd(item)}
                  className="group flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-start backdrop-blur transition-colors hover:border-accent/40 hover:bg-white/[0.08]"
                >
                  <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-white/30">
                        <Coffee className="h-6 w-6" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      {menuKindLabel(item.kind)}
                    </span>
                    <span className="mt-0.5 block truncate font-display text-lg text-white">
                      {item.name}
                    </span>
                    <span className="numeric mt-1 block text-sm font-semibold text-accent">
                      {formatMoney(startingPrice(item))}
                    </span>
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section id="offers" className="scroll-mt-24">
        <SectionHeading
          eyebrow={t('home.offers.eyebrow')}
          title={t('home.offers.title')}
          subtitle={t('home.offers.subtitle')}
        />
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {offers.map((offer) => {
            const Icon = offer.icon;
            return (
              <article
                key={offer.key}
                className="group relative isolate flex h-[360px] flex-col justify-end overflow-hidden rounded-2xl bg-[#1a110b] p-6 text-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <img
                  src={offer.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-[#120b07]/95 via-[#120b07]/45 to-[#120b07]/10"
                />
                <span className="absolute start-5 top-5 rounded-full bg-accent px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-accent-foreground">
                  {t(offer.tagKey)}
                </span>
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="font-display text-[26px] leading-tight">{t(offer.titleKey)}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                  {t(offer.descriptionKey)}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
                  <p className="flex items-baseline gap-2">
                    <span className="numeric text-base font-semibold text-accent">
                      {t(offer.priceKey)}
                    </span>
                    <span className="numeric text-[11px] text-white/40 line-through">
                      {t(offer.oldPriceKey)}
                    </span>
                  </p>
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => onNavigate('pos')}
                  >
                    {t('home.offers.claim')}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="about" className="scroll-mt-24">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-border bg-muted shadow-soft">
              <img
                src={aboutImage}
                alt={t('home.about.imageAlt')}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 start-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-pop">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Flame className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('home.hero.badge')}
                </p>
                <p className="font-display text-[17px] text-foreground">{t('app.name')}</p>
              </div>
            </div>
          </div>
          <div>
            <SectionHeading
              eyebrow={t('home.about.eyebrow')}
              title={t('home.about.title')}
            />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {t('home.about.paragraph1')}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('home.about.paragraph2')}
            </p>
            <ul className="mt-7 space-y-3.5">
              {(
                [
                  { key: 'sourcing', icon: Leaf },
                  { key: 'roasting', icon: Flame },
                  { key: 'craft', icon: Coffee },
                ] as const
              ).map((point) => {
                const Icon = point.icon;
                return (
                  <li key={point.key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-foreground">
                      {t(`home.about.points.${point.key}` as const)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section id="reviews" className="scroll-mt-24">
        <SectionHeading
          eyebrow={t('home.reviews.eyebrow')}
          title={t('home.reviews.title')}
          subtitle={t('home.reviews.subtitle')}
        />
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {reviews.map((review) => (
            <figure
              key={review.key}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-soft"
            >
              <Quote className="h-6 w-6 text-accent/70" aria-hidden="true" />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/85">
                {t(review.quoteKey)}
              </blockquote>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 font-display text-sm text-secondary">
                  {t(`home.reviews.items.${review.key}.name` as const).charAt(0)}
                </span>
                <figcaption className="leading-tight">
                  <p className="text-[13px] font-semibold text-foreground">
                    {t(`home.reviews.items.${review.key}.name` as const)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t(`home.reviews.items.${review.key}.role` as const)}
                  </p>
                </figcaption>
                <span className="ms-auto flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                </span>
              </div>
            </figure>
          ))}
        </div>
      </section>

      <footer className="relative overflow-hidden rounded-[2rem] bg-[#17100b] px-6 py-10 text-white sm:px-10 lg:px-12">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -start-20 bottom-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,hsl(30_68%_46%/0.22),transparent_65%)]"
        />
        <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={qahwaLogo}
                alt=""
                className="h-11 w-11 rounded-full ring-1 ring-white/15"
              />
              <div className="leading-tight">
                <p className="font-display text-xl tracking-[0.12em]">{t('app.name')}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45">
                  {t('app.company')}
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              {t('home.footer.tagline')}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
              {t('home.footer.visit')}
            </p>
            <p className="mt-3 flex items-start gap-2 text-sm text-white/60">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
              {t('app.location')}
            </p>
            <p className="mt-2 flex items-start gap-2 text-sm text-white/60">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
              {t('home.footer.hoursValue')}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
              {t('home.footer.contact')}
            </p>
            <a
              href="tel:+20223584410"
              className="mt-3 flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
              dir="ltr"
            >
              <Phone className="h-4 w-4 text-white/40" />
              +20 2 2358 4410
            </a>
            <a
              href="mailto:hello@qahwa.cafe"
              className="mt-2 flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
              dir="ltr"
            >
              <span className="flex h-4 w-4 items-center justify-center text-white/40">@</span>
              hello@qahwa.cafe
            </a>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
              {t('home.footer.explore')}
            </p>
            <div className="mt-3 space-y-2 text-sm text-white/60">
              {[
                { label: t('home.footer.links.menu'), target: 'menu' },
                { label: t('home.footer.links.about'), target: 'about' },
                { label: t('home.footer.links.offers'), target: 'offers' },
                { label: t('home.footer.links.reviews'), target: 'reviews' },
              ].map((link) => (
                <button
                  key={link.target}
                  type="button"
                  onClick={() => scrollTo(link.target)}
                  className="block text-start transition-colors hover:text-white"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[11px] text-white/35">
          <p>{t('home.footer.rights', { year: new Date().getFullYear() })}</p>
          <p className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent/70" />
            {t('home.footer.follow')} · {socials.map((social) => social.label).join(' · ')}
          </p>
        </div>
      </footer>
    </div>
  );
}
