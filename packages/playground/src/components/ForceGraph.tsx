import { useEffect, useMemo, useRef, useState } from "react"
import type { GraphSnapshot } from "../runner/snapshot.js"

const NODE_RADIUS = 17
const LINK_LENGTH = 120
const VIEW_PADDING = 70
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const PALETTE = [
    "#3fb950",
    "#58a6ff",
    "#d29922",
    "#a371f7",
    "#f778ba",
    "#39c5cf",
    "#ffa657",
    "#e3b341",
]

type SimNode = {
    id: string
    /**
     * Stable identity across runs. Published records get a new PID every time
     * they are republished, but their local ID stays the same, so positions
     * can be carried over instead of resetting the whole layout.
     */
    key: string
    pid: string | undefined
    label: string
    color: string
    x: number
    y: number
    vx: number
    vy: number
}

type SimLink = {
    source: string
    target: string
    attribute: string
    direction: "uni" | "bidi"
}

type Simulation = {
    nodes: SimNode[]
    links: SimLink[]
    profileColors: [string, string][]
}

function shorten(id: string): string {
    return id.replace(/^LOCAL\//, "").replace(/^EXTERNAL\//, "EXT/")
}

function buildSimulation(snapshot: GraphSnapshot): Simulation {
    const profileColors = new Map<string, string>()
    for (const record of snapshot.records) {
        for (const profile of record.profiles) {
            if (!profileColors.has(profile)) {
                profileColors.set(
                    profile,
                    PALETTE[profileColors.size % PALETTE.length]!,
                )
            }
        }
    }

    const nodes: SimNode[] = snapshot.records.map((record, index) => {
        const angle = index * GOLDEN_ANGLE
        const radius = 34 + 30 * Math.sqrt(index)
        return {
            id: record.id,
            key: record.localID ?? record.id,
            pid: record.pid,
            label: shorten(record.id),
            color:
                record.profiles.length > 0
                    ? profileColors.get(record.profiles[0]!)!
                    : "#6e7681",
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
        }
    })

    const nodeIds = new Set(nodes.map((node) => node.id))
    const seen = new Set<string>()
    const links: SimLink[] = []
    for (const record of snapshot.records) {
        for (const reference of record.references) {
            // Derived references mirror a bidirectional reference that is
            // declared on the other record; the declared edge already
            // represents the relationship in the graph.
            if (reference.derived) continue
            if (!nodeIds.has(record.id) || !nodeIds.has(reference.target))
                continue
            const key = `${record.id}\u0000${reference.target}\u0000${reference.attribute}`
            if (seen.has(key)) continue
            seen.add(key)
            links.push({
                source: record.id,
                target: reference.target,
                attribute: shorten(reference.attribute),
                direction: reference.direction,
            })
        }
    }

    return { nodes, links, profileColors: [...profileColors.entries()] }
}

function simulate(
    nodes: SimNode[],
    links: SimLink[],
    dragged: SimNode | null,
): number {
    let energy = 0

    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j]!
            let dx = a.x - b.x
            let dy = a.y - b.y
            let distanceSquared = dx * dx + dy * dy
            if (distanceSquared < 1) {
                dx = 0.5
                dy = 0.5
                distanceSquared = 1
            }
            const distance = Math.sqrt(distanceSquared)
            const force = 2600 / distanceSquared
            const fx = (dx / distance) * force
            const fy = (dy / distance) * force
            a.vx += fx
            a.vy += fy
            b.vx -= fx
            b.vy -= fy
        }
    }

    const byId = new Map(nodes.map((node) => [node.id, node]))
    for (const link of links) {
        const a = byId.get(link.source)
        const b = byId.get(link.target)
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const force = ((distance - LINK_LENGTH) / distance) * 0.05
        const fx = dx * force
        const fy = dy * force
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
    }

    for (const node of nodes) {
        if (node === dragged) {
            node.vx = 0
            node.vy = 0
            continue
        }
        node.vx = (node.vx - node.x * 0.003) * 0.82
        node.vy = (node.vy - node.y * 0.003) * 0.82
        node.x += node.vx
        node.y += node.vy
        energy += Math.abs(node.vx) + Math.abs(node.vy)
    }

    return energy
}

type ForceGraphProps = {
    snapshot: GraphSnapshot
    selectedId: string | null
    onSelect: (id: string | null) => void
}

export function ForceGraph({
    snapshot,
    selectedId,
    onSelect,
}: ForceGraphProps) {
    const simulationRef = useRef<Simulation | null>(null)
    const simulation = useMemo(() => {
        const previousNodes = simulationRef.current?.nodes ?? []
        const previousById = new Map(
            previousNodes.map((node) => [node.id, node]),
        )
        // Republishing gives a record a new PID, so a record that carries the
        // same local ID is still the same node for layout purposes.
        const previousByKey = new Map<string, SimNode[]>()
        for (const node of previousNodes) {
            const bucket = previousByKey.get(node.key)
            if (bucket === undefined) previousByKey.set(node.key, [node])
            else bucket.push(node)
        }

        const result = buildSimulation(snapshot)
        const reused = new Set<SimNode>()
        const fresh: SimNode[] = []
        let anchorX = 0
        let anchorY = 0
        let carried = 0

        const carry = (node: SimNode, old: SimNode) => {
            node.x = old.x
            node.y = old.y
            anchorX += old.x
            anchorY += old.y
            carried++
            reused.add(old)
        }

        for (const node of result.nodes) {
            const exact = previousById.get(node.id)
            if (exact !== undefined && !reused.has(exact)) {
                carry(node, exact)
                continue
            }
            const match = previousByKey
                .get(node.key)
                ?.find((candidate) => !reused.has(candidate))
            if (match !== undefined) carry(node, match)
            else fresh.push(node)
        }

        // Place genuinely new records on a ring outside the settled cluster,
        // so updates only nudge the layout instead of resetting and exploding
        // it. The very first snapshot keeps the seed spiral.
        if (carried > 0) {
            anchorX /= carried
            anchorY /= carried
            let clusterRadius = 0
            for (const node of reused) {
                clusterRadius = Math.max(
                    clusterRadius,
                    Math.hypot(node.x - anchorX, node.y - anchorY),
                )
            }
            fresh.forEach((node, index) => {
                const angle = index * GOLDEN_ANGLE
                const distance = clusterRadius + 60 + 20 * Math.sqrt(index)
                node.x = anchorX + Math.cos(angle) * distance
                node.y = anchorY + Math.sin(angle) * distance
            })
        }

        return result
    }, [snapshot])

    const [tick, setTick] = useState(0)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const svgRef = useRef<SVGSVGElement | null>(null)
    const draggedRef = useRef<SimNode | null>(null)
    const dragRef = useRef<{
        node: SimNode
        pointerId: number
        startX: number
        startY: number
    } | null>(null)
    const suppressClickRef = useRef(false)

    useEffect(() => {
        simulationRef.current = simulation
        let raf = 0
        const step = () => {
            const energy = simulate(
                simulation.nodes,
                simulation.links,
                draggedRef.current,
            )
            if (energy > 0.4 || draggedRef.current !== null) {
                setTick((value) => value + 1)
            }
            raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf)
    }, [simulation])

    const nodes = simulation.nodes
    const links = simulation.links
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const activeId = hoveredId ?? selectedId

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const node of nodes) {
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x)
        maxY = Math.max(maxY, node.y)
    }
    const width = Math.max(maxX - minX, 400) + 2 * VIEW_PADDING
    const height = Math.max(maxY - minY, 300) + 2 * VIEW_PADDING
    const viewBox = `${minX - VIEW_PADDING} ${minY - VIEW_PADDING} ${width} ${height}`

    function toSvgCoordinates(clientX: number, clientY: number) {
        const ctm = svgRef.current?.getScreenCTM()
        if (!ctm) return { x: 0, y: 0 }
        const point = new DOMPoint(clientX, clientY).matrixTransform(
            ctm.inverse(),
        )
        return { x: point.x, y: point.y }
    }

    function onPointerDown(
        event: React.PointerEvent<SVGCircleElement>,
        node: SimNode,
    ) {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        const { x, y } = toSvgCoordinates(event.clientX, event.clientY)
        dragRef.current = {
            node,
            pointerId: event.pointerId,
            startX: x,
            startY: y,
        }
        suppressClickRef.current = false
    }

    function onPointerMove(event: React.PointerEvent<SVGCircleElement>) {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        const { x, y } = toSvgCoordinates(event.clientX, event.clientY)
        if (Math.abs(x - drag.startX) > 3 || Math.abs(y - drag.startY) > 3) {
            suppressClickRef.current = true
        }
        drag.node.x = x
        drag.node.y = y
        draggedRef.current = drag.node
        setTick((value) => value + 1)
    }

    function onPointerUp(event: React.PointerEvent<SVGCircleElement>) {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        draggedRef.current = null
        dragRef.current = null
    }

    function toggleSelect(node: SimNode) {
        if (suppressClickRef.current) return
        onSelect(selectedId === node.id ? null : node.id)
    }

    if (nodes.length === 0) {
        return (
            <div className="force-graph-wrap">
                <p className="empty">No records in this graph.</p>
            </div>
        )
    }

    return (
        <div className="force-graph-wrap">
            <svg
                ref={svgRef}
                className="force-graph"
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={`Force graph with ${nodes.length} records and ${links.length} references`}
            >
                <defs>
                    <marker
                        id="playground-arrow-uni"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                    >
                        <path className="marker-uni" d="M 0 1 L 9 5 L 0 9 z" />
                    </marker>
                    <marker
                        id="playground-arrow-bidi"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                    >
                        <path className="marker-bidi" d="M 0 1 L 9 5 L 0 9 z" />
                    </marker>
                </defs>
                <g>
                    {links.map((link, index) => {
                        const source = byId.get(link.source)
                        const target = byId.get(link.target)
                        if (!source || !target) return null
                        const active =
                            activeId === link.source || activeId === link.target
                        const isMappingLink =
                            link.attribute === "attr/partOfMapping" ||
                            link.attribute === "attr/hasMappingRecord"
                        const marker =
                            link.direction === "bidi"
                                ? "url(#playground-arrow-bidi)"
                                : "url(#playground-arrow-uni)"
                        return (
                            <g key={index}>
                                <line
                                    className={`link${link.direction === "bidi" ? " link-bidi" : ""}${isMappingLink ? " link-mapping" : ""}${active ? " link-active" : ""}`}
                                    x1={source.x}
                                    y1={source.y}
                                    x2={target.x}
                                    y2={target.y}
                                    markerEnd={marker}
                                    markerStart={
                                        link.direction === "bidi"
                                            ? marker
                                            : undefined
                                    }
                                />
                                {active && (
                                    <text
                                        className={`link-label${isMappingLink ? " link-label-mapping" : ""}`}
                                        x={(source.x + target.x) / 2}
                                        y={(source.y + target.y) / 2 - 6}
                                        textAnchor="middle"
                                    >
                                        {`${link.direction === "bidi" ? "↔" : "→"} ${link.attribute}`}
                                    </text>
                                )}
                            </g>
                        )
                    })}
                </g>
                <g>
                    {nodes.map((node) => {
                        const selected = selectedId === node.id
                        return (
                            <g key={node.id} className="force-node">
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={NODE_RADIUS}
                                    fill={node.color}
                                    stroke={
                                        selected
                                            ? "var(--text)"
                                            : "rgba(10, 13, 18, 0.9)"
                                    }
                                    strokeWidth={selected ? 3 : 2}
                                    tabIndex={0}
                                    role="button"
                                    aria-pressed={selected}
                                    aria-label={`Record ${node.id}`}
                                    onPointerDown={(event) =>
                                        onPointerDown(event, node)
                                    }
                                    onPointerMove={onPointerMove}
                                    onPointerUp={onPointerUp}
                                    onClick={() => toggleSelect(node)}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            event.preventDefault()
                                            onSelect(selected ? null : node.id)
                                        }
                                    }}
                                    onPointerEnter={() => setHoveredId(node.id)}
                                    onPointerLeave={() => setHoveredId(null)}
                                >
                                    <title>
                                        {node.pid !== undefined
                                            ? `${node.id} — PID ${node.pid}`
                                            : node.id}
                                    </title>
                                </circle>
                                <text
                                    className="node-label"
                                    x={node.x}
                                    y={node.y + NODE_RADIUS + 14}
                                    textAnchor="middle"
                                >
                                    {node.label}
                                </text>
                            </g>
                        )
                    })}
                </g>
            </svg>
            {simulation.profileColors.length > 0 && (
                <div className="force-legend">
                    {simulation.profileColors.map(([profile, color]) => (
                        <span key={profile}>
                            <span
                                className="force-legend-swatch"
                                style={{ background: color }}
                            />
                            {profile}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}
