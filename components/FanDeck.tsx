"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, WheelEvent } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { DeckCard, SelectedReadingCard } from "@/lib/reading";
import { tarotCardById } from "@/data/tarotCards";
import { TarotCardView } from "@/components/TarotCardView";

gsap.registerPlugin(useGSAP);

type Props = {
	deck: DeckCard[];
	selected: SelectedReadingCard[];
	locked: boolean;
	onSelect: (item: DeckCard, element: HTMLButtonElement) => void;
};

const DESKTOP_SPACING = 62;
const MOBILE_SPACING = 52;

export function FanDeck({ deck, selected, locked, onSelect }: Props) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const cardRefs = useRef(new Map<number, HTMLButtonElement>());
	const committingRef = useRef(false);
	const scrollFrameRef = useRef<number | null>(null);
	const [committingId, setCommittingId] = useState<number | null>(null);
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

	const handleScroll = () => {
		if (scrollFrameRef.current !== null) return;
		scrollFrameRef.current = window.requestAnimationFrame(() => {
			scrollFrameRef.current = null;
			setScrollLeft(scrollRef.current?.scrollLeft ?? 0);
		});
	};

	const chooseCard = (item: DeckCard) => {
		if (locked || committingRef.current || selectedIds.has(item.cardId)) return;
		const element = cardRefs.current.get(item.cardId);
		if (!element) return;
		committingRef.current = true;
		setCommittingId(item.cardId);
		onSelect(item, element);
		window.setTimeout(() => {
			committingRef.current = false;
			setCommittingId(null);
		}, 950);
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
			chooseCard(item);
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
		<div className="relative mx-auto max-w-[1220px] pb-8 md:pb-16">
			<div
				ref={scrollRef}
				className="fan-scroll relative h-[350px] w-full overflow-x-auto overflow-y-hidden overscroll-x-contain md:h-[390px]"
				role="listbox"
				aria-label={`完整塔罗牌组，共 ${deck.length} 张`}
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
						if (!card) return null;
						return (
							<div
								key={item.cardId}
								role="option"
								aria-selected={isSelected}
								aria-disabled={locked || isSelected || committingRef.current}
								aria-label={`第 ${index + 1} 张未揭示的塔罗牌`}
								tabIndex={locked || isSelected ? -1 : 0}
								data-fan-index={index}
								className={`fan-hit-slot group absolute top-0 z-[1] h-full w-[52px] -translate-x-1/2 cursor-pointer outline-none transition-opacity duration-300 focus-visible:z-[320] md:w-[62px] ${locked || committingRef.current ? "cursor-wait" : ""} ${isSelected ? "pointer-events-none opacity-0" : ""}`}
								style={
									{
										left: `${x}px`,
										zIndex: isCommitting ? 330 : index + 1,
									} as React.CSSProperties
								}
								onClick={() => chooseCard(item)}
								onKeyDown={(event) => handleSlotKeyDown(event, index, item)}
							>
								<span
									className="fan-card pointer-events-none absolute left-1/2 block"
									style={
										{
											top: `${y}px`,
											"--fan-angle": `${rotation}deg`,
											zIndex: isCommitting ? 330 : index + 1,
										} as React.CSSProperties
									}
								>
									<span className="fan-card-enter block transition-[transform,filter] duration-300 ease-out group-hover:-translate-y-6 group-hover:drop-shadow-[0_0_18px_rgba(216,191,136,.5)] group-focus-visible:-translate-y-6 group-focus-visible:drop-shadow-[0_0_18px_rgba(216,191,136,.5)]">
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
											className="pointer-events-none group-hover:ring-1 group-hover:ring-antiqueGold/70 group-focus-visible:ring-1 group-focus-visible:ring-antiqueGold/70"
										/>
									</span>
								</span>
							</div>
						);
					})}
				</div>
			</div>

			<p className="mt-4 text-center text-[11px] tracking-[.16em] text-moon/35">
				完整 {deck.length} 张牌 · 左右滑动浏览 · 首尾牌都可滑到中央
			</p>
		</div>
	);
}
