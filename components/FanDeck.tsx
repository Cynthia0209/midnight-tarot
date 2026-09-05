"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, WheelEvent } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { DeckCard, SelectedReadingCard } from "@/lib/reading";
import { tarotCardById } from "@/data/tarotCards";
import { TarotCardView } from "@/components/TarotCardView";
import { RitualButton } from "@/components/RitualButton";
import type { Locale } from "@/lib/locale";

gsap.registerPlugin(useGSAP);

type Props = {
	deck: DeckCard[];
	selected: SelectedReadingCard[];
	locked: boolean;
	onSelect: (item: DeckCard, element: HTMLButtonElement) => void;
	locale?: Locale;
};

const DESKTOP_SPACING = 62;
const MOBILE_SPACING = 52;

export function FanDeck({ deck, selected, locked, onSelect, locale = "zh" }: Props) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const cardRefs = useRef(new Map<number, HTMLButtonElement>());
	const committingRef = useRef(false);
	const scrollFrameRef = useRef<number | null>(null);
	const confirmRef = useRef<HTMLButtonElement>(null);
	const [committingId, setCommittingId] = useState<number | null>(null);
	const [pendingId, setPendingId] = useState<number | null>(null);
	const [hasInteracted, setHasInteracted] = useState(false);
	const [viewportWidth, setViewportWidth] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const selectedIds = useMemo(
		() => new Set(selected.map((item) => item.cardId)),
		[selected],
	);
	const spacing = viewportWidth >= 768 ? DESKTOP_SPACING : MOBILE_SPACING;
	const sidePadding = Math.max(viewportWidth / 2, 1);
	const trackWidth = sidePadding * 2 + Math.max(0, deck.length - 1) * spacing;

	const layout = useMemo(
		() =>
			deck.map((item, index) => {
				const x = sidePadding + index * spacing;
				const relativeToCenter = viewportWidth
					? (x - scrollLeft - viewportWidth / 2) / (viewportWidth / 2)
					: 0;
				const normalized = Math.max(-1, Math.min(1, relativeToCenter));
				const distance = Math.abs(normalized);
				return {
					item,
					index,
					x,
					y: 46 + Math.pow(distance, 1.65) * (viewportWidth >= 768 ? 108 : 86),
					rotation: normalized * (viewportWidth >= 768 ? 34 : 27),
				};
			}),
		[deck, scrollLeft, sidePadding, spacing, viewportWidth],
	);
	const pendingItem = pendingId === null
		? null
		: deck.find((item) => item.cardId === pendingId) ?? null;
	const guideCardId = !hasInteracted && selected.length === 0 && pendingId === null
		? layout.reduce<{ cardId: number; distance: number } | null>((closest, entry) => {
			const distance = Math.abs(entry.x - scrollLeft - viewportWidth / 2);
			return !closest || distance < closest.distance
				? { cardId: entry.item.cardId, distance }
				: closest;
		}, null)?.cardId ?? null
		: null;

	useGSAP(
		() => {
			const reduced = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			gsap.fromTo(
				".fan-card-enter",
				{ opacity: 0, y: reduced ? 10 : 80 },
				{
					opacity: 1,
					y: 0,
					duration: reduced ? 0.2 : 1,
					stagger: 0.012,
					ease: "power3.out",
				},
			);
		},
		{ scope: trackRef },
	);

	useEffect(() => {
		const container = scrollRef.current;
		if (!container) return;
		let initialized = false;
		const updateDimensions = () => {
			const width = container.clientWidth;
			setViewportWidth(width);
			if (!initialized) {
				initialized = true;
				const maxScroll = Math.max(
					0,
					(deck.length - 1) * (width >= 768 ? DESKTOP_SPACING : MOBILE_SPACING),
				);
				container.scrollLeft = maxScroll / 2;
				setScrollLeft(container.scrollLeft);
			}
		};
		updateDimensions();
		const observer = new ResizeObserver(updateDimensions);
		observer.observe(container);
		return () => {
			observer.disconnect();
			if (scrollFrameRef.current !== null) {
				window.cancelAnimationFrame(scrollFrameRef.current);
				scrollFrameRef.current = null;
			}
		};
	}, [deck.length]);

	useEffect(() => {
		if (pendingId === null) return;
		confirmRef.current?.focus({ preventScroll: true });
		const cancelWithEscape = (event: globalThis.KeyboardEvent) => {
			if (event.key === "Escape" && !committingRef.current) {
				setPendingId(null);
			}
		};
		window.addEventListener("keydown", cancelWithEscape);
		return () => window.removeEventListener("keydown", cancelWithEscape);
	}, [pendingId]);

	useEffect(() => {
		if (pendingId !== null && selectedIds.has(pendingId)) setPendingId(null);
	}, [pendingId, selectedIds]);

	const handleScroll = () => {
		if (scrollFrameRef.current !== null) return;
		scrollFrameRef.current = window.requestAnimationFrame(() => {
			scrollFrameRef.current = null;
			setScrollLeft(scrollRef.current?.scrollLeft ?? 0);
		});
	};

	const commitCard = (item: DeckCard) => {
		if (locked || committingRef.current || selectedIds.has(item.cardId)) return;
		const element = cardRefs.current.get(item.cardId);
		if (!element) return;
		committingRef.current = true;
		setPendingId(null);
		setCommittingId(item.cardId);
		onSelect(item, element);
		window.setTimeout(() => {
			committingRef.current = false;
			setCommittingId(null);
		}, 950);
	};

	const prepareCard = (item: DeckCard) => {
		if (locked || committingRef.current || selectedIds.has(item.cardId)) return;
		setHasInteracted(true);
		setPendingId(item.cardId);
	};

	const focusSlot = (index: number) => {
		const slot = trackRef.current?.querySelector<HTMLDivElement>(
			`[data-fan-index="${index}"]`,
		);
		slot?.focus({ preventScroll: true });
		slot?.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
			inline: "center",
		});
	};

	const handleSlotKeyDown = (
		event: KeyboardEvent<HTMLDivElement>,
		index: number,
		item: DeckCard,
	) => {
		if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
			event.preventDefault();
			const direction = event.key === "ArrowRight" ? 1 : -1;
			for (let offset = 1; offset <= deck.length; offset += 1) {
				const candidate =
					(index + direction * offset + deck.length) % deck.length;
				if (!selectedIds.has(deck[candidate].cardId)) {
					focusSlot(candidate);
					return;
				}
			}
		} else if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			prepareCard(item);
		}
	};

	const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
		const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY);
		if (!event.shiftKey && !horizontalIntent) return;
		event.preventDefault();
		event.currentTarget.scrollLeft += horizontalIntent
			? event.deltaX
			: event.deltaY;
	};

	return (
		<div className="relative mx-auto max-w-[1220px] pb-1 md:pb-2">
			{guideCardId !== null && (
				<div className="pointer-events-none absolute left-1/2 top-0 z-[450] -translate-x-1/2 text-center" aria-hidden="true">
					<p className="font-zhSerif text-sm tracking-[.12em] text-moon/75">{locale === "en" ? "Touch a card to begin sensing" : "轻触一张牌，开始感应"}</p>
					<div className="mx-auto mt-1 h-6 w-px bg-gradient-to-b from-antiqueGold/70 to-transparent">
						<span className="fan-guide-spark block h-1.5 w-1.5 -translate-x-[2.5px] rounded-full bg-antiqueGold shadow-[0_0_12px_rgba(216,191,136,.8)]" />
					</div>
				</div>
			)}
			<div
				ref={scrollRef}
				className="fan-scroll relative h-[300px] w-full overflow-x-auto overflow-y-hidden overscroll-x-contain md:h-[340px]"
				role="listbox"
				aria-label={locale === "en" ? `Full tarot deck, ${deck.length} cards` : `完整塔罗牌组，共 ${deck.length} 张`}
				onWheel={handleWheel}
				onScroll={handleScroll}
			>
				<div
					ref={trackRef}
					className="fan-deck-track relative h-full"
					style={
						{
							width: `${trackWidth}px`,
							minWidth: `${trackWidth}px`,
						} as React.CSSProperties
					}
				>
					{layout.map(({ item, index, x, y, rotation }) => {
						const card = tarotCardById.get(item.cardId);
						const isSelected = selectedIds.has(item.cardId);
						const isCommitting = committingId === item.cardId;
						const isPending = pendingId === item.cardId;
						const isGuided = guideCardId === item.cardId;
						if (!card) return null;
						return (
							<div
								key={item.cardId}
								role="option"
								aria-selected={isSelected}
								aria-current={isPending ? "true" : undefined}
								aria-disabled={locked || isSelected || committingRef.current}
								aria-label={locale === "en"
									? `Unrevealed tarot card ${index + 1}${isPending ? ", waiting for confirmation" : ""}`
									: `第 ${index + 1} 张未揭示的塔罗牌${isPending ? "，等待确认" : ""}`}
								tabIndex={locked || isSelected ? -1 : 0}
								data-fan-index={index}
								className={`fan-hit-slot group absolute top-0 z-[1] h-full w-[52px] -translate-x-1/2 cursor-pointer outline-none transition-opacity duration-300 focus-visible:z-[320] md:w-[62px] ${locked || committingRef.current ? "cursor-not-allowed" : ""} ${isSelected ? "pointer-events-none opacity-0" : ""} ${pendingId !== null && !isPending ? "opacity-45" : ""}`}
								style={
									{
										left: `${x}px`,
										zIndex: isCommitting || isPending ? 330 : index + 1,
									} as React.CSSProperties
								}
								onClick={() => prepareCard(item)}
								onKeyDown={(event) => handleSlotKeyDown(event, index, item)}
							>
								<span
									className="fan-card pointer-events-none absolute left-1/2 block"
									style={
										{
											top: `${y}px`,
											"--fan-angle": `${rotation}deg`,
											zIndex: isCommitting || isPending ? 330 : index + 1,
										} as React.CSSProperties
									}
								>
										<span className={`fan-card-enter block transition-[transform,filter] duration-300 ease-out group-hover:-translate-y-6 group-hover:drop-shadow-[0_0_18px_rgba(216,191,136,.5)] group-focus-visible:-translate-y-6 group-focus-visible:drop-shadow-[0_0_18px_rgba(216,191,136,.5)] ${isPending ? "-translate-y-9 drop-shadow-[0_0_24px_rgba(216,191,136,.72)]" : ""} ${isGuided ? "fan-guide-card" : ""}`}>
										<TarotCardView
											ref={(element) => {
												if (element) cardRefs.current.set(item.cardId, element);
												else cardRefs.current.delete(item.cardId);
											}}
											card={card}
											disabled
											compact
											flipId={`card-${item.cardId}`}
											tabIndex={-1}
											locale={locale}
											className={`pointer-events-none group-hover:ring-1 group-hover:ring-antiqueGold/70 group-focus-visible:ring-1 group-focus-visible:ring-antiqueGold/70 ${isPending ? "ring-2 ring-antiqueGold/80" : ""} ${isGuided ? "ring-1 ring-antiqueGold/45" : ""}`}
										/>
									</span>
								</span>
							</div>
						);
					})}
				</div>
			</div>

			<p className={`mt-2 text-center text-[11px] tracking-[.16em] transition-colors duration-500 ${guideCardId !== null ? "text-antiqueGold/65" : "text-moon/55"}`}>
				{guideCardId !== null
					? locale === "en" ? "Tap the card that draws you in · You can confirm before choosing" : "点一下吸引你的牌 · 选择后还可以重新确认"
					: locale === "en" ? `Full ${deck.length}-card deck · Tap to confirm · The first and last cards can move to the center` : `完整 ${deck.length} 张牌 · 点击后确认选择 · 首尾牌都可滑到中央`}
			</p>

			{pendingItem && (
					<div className="pointer-events-none relative z-[500] mt-1 flex animate-[confirm-rise_.3s_ease-out] justify-center px-4">
						<div className="fan-confirm-panel pointer-events-auto flex max-w-md flex-col items-center px-7 py-3 text-center">
						<p className="font-display text-[9px] uppercase tracking-[.42em] text-antiqueGold/65">Listen once more</p>
						<p className="mt-2 font-zhSerif text-lg tracking-[.1em] text-moon">{locale === "en" ? "Choose this card?" : "确定选择这张牌吗？"}</p>
						<div className="mt-4 flex flex-col items-center gap-2">
							<RitualButton
								ref={confirmRef}
								type="button"
								compact
								disabled={committingRef.current}
								onClick={() => commitCard(pendingItem)}
							>
								{locale === "en" ? "Confirm this card" : "确认这张牌"}
							</RitualButton>
							<button
								type="button"
								onClick={() => setPendingId(null)}
								className="px-3 py-2 text-[11px] tracking-[.08em] text-moon/60 transition hover:text-moon focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-antiqueGold"
							>
								{locale === "en" ? "Choose again" : "重新选择"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
