/**
 * RelationGraph - 力导向关系网络图
 * 使用 react-force-graph-2d 渲染
 */
import React, { useMemo, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphData } from 'force-graph';
import { useWorldStore } from '../../store/worldStore';
import GraphControls from './GraphControls';

interface RelationGraphProps {
  onNodeSelect?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
}

interface GraphNodeData {
  id: string;
  name: string;
  avatar?: string;
  factionId: string;
  factionColor: string;
}

// Force-graph adds x/y/vx/vy to nodes at runtime
type ForceGraphNode = GraphNodeData & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

interface GraphLink {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  type: string;
  description?: string;
}

const RelationGraph: React.FC<RelationGraphProps> = (props) => {
  const characters = useWorldStore((s) => s.data.characters);
  const factions = useWorldStore((s) => s.data.factions);
  const relations = useWorldStore((s) => s.data.relations);

  const isControlled = 'onNodeSelect' in props && props.onNodeSelect !== undefined;
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedNodeId = isControlled ? (props.selectedNodeId ?? null) : internalSelectedId;

  const [selectedFactions, setSelectedFactions] = useState<string[]>(factions.map((f) => f.id));
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>([]);
  const [hoverNode, setHoverNode] = useState<ForceGraphNode | null>(null);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    if (isControlled && props.onNodeSelect) {
      props.onNodeSelect(nodeId);
    } else {
      setInternalSelectedId(nodeId);
    }
  }, [isControlled, props.onNodeSelect]);

  // Build graph data with filtering
  const graphData: GraphData = useMemo(() => {
    // Filter characters by faction (if any selected)
    const visibleCharIds = new Set(
      selectedFactions.length > 0
        ? characters.filter((c) => selectedFactions.includes(c.factionId)).map((c) => c.id)
        : characters.map((c) => c.id)
    );

    const nodes: ForceGraphNode[] = [];

    const factionMap = new Map(factions.map((f) => [f.id, f]));

    for (const char of characters) {
      if (!visibleCharIds.has(char.id)) continue;

      const faction = factionMap.get(char.factionId);
      const node: ForceGraphNode = {
        id: char.id,
        name: char.name,
        avatar: char.avatar,
        factionId: char.factionId,
        factionColor: faction?.color ?? '#8B4513',
      };
      nodes.push(node);
    }

    // Build links (filter by relation types if selected)
    let links: GraphLink[] = relations
      .filter((r) =>
        visibleCharIds.has(r.sourceId) &&
        visibleCharIds.has(r.targetId) &&
        (selectedRelationTypes.length === 0 || selectedRelationTypes.includes(r.type))
      )
      .map((r) => ({
        source: r.sourceId,
        target: r.targetId,
        type: r.type,
        description: r.description,
      }));

    return { nodes, links };
  }, [characters, factions, relations, selectedFactions, selectedRelationTypes]);

  const handleFactionToggle = useCallback(
    (factionId: string) => {
      setSelectedFactions((prev) =>
        prev.includes(factionId)
          ? prev.filter((id) => id !== factionId)
          : [...prev, factionId]
      );
    },
    []
  );

  const handleRelationTypeToggle = useCallback(
    (type: string) => {
      setSelectedRelationTypes((prev) =>
        prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
      );
    },
    []
  );

  // Compute neighbor set for ghosting effect
  const neighborSet = useMemo(() => {
    if (!selectedNodeId) return null;
    const neighbors = new Set<string>([selectedNodeId]);
    for (const link of graphData.links) {
      const srcId = typeof link.source === 'string' ? link.source : (link.source as ForceGraphNode).id;
      const tgtId = typeof link.target === 'string' ? link.target : (link.target as ForceGraphNode).id;
      if (srcId === selectedNodeId) neighbors.add(tgtId);
      if (tgtId === selectedNodeId) neighbors.add(srcId);
    }
    return neighbors;
  }, [selectedNodeId, graphData]);

  if (characters.length === 0) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#aaa',
      }}>
        <Typography variant="h6">暂无人物数据</Typography>
        <Typography variant="body2">
          请先添加人物，关系图将自动显示人物之间的关系
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {/* Controls */}
      <GraphControls
        selectedFactions={selectedFactions}
        onFactionToggle={handleFactionToggle}
        selectedRelationTypes={selectedRelationTypes}
        onRelationTypeToggle={handleRelationTypeToggle}
      />

      {/* Hover info */}
      {hoverNode && (
        <Box sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 1,
          p: 1.5,
          zIndex: 10,
          boxShadow: 2,
        }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {hoverNode.name}
          </Typography>
          {hoverNode.avatar && (
            <img
              src={hoverNode.avatar}
              alt={hoverNode.name}
              style={{ width: 40, height: 40, borderRadius: '50%' }}
            />
          )}
        </Box>
      )}

      {/* Force graph */}
      <ForceGraph2D
        graphData={graphData}
        width={undefined}
        height={undefined}
        nodeId="id"
        nodeLabel="name"
        nodeAutoColorBy="factionColor"
        nodeCanvasObject={(node, ctx, globalScale) => {
          const gNode = node as unknown as ForceGraphNode;
          const label = gNode.name;
          const fontSize = Math.max(12 / globalScale, 3);
          const x = gNode.x ?? 0;
          const y = gNode.y ?? 0;

          // Ghosting logic
          const isSelected = selectedNodeId ? gNode.id === selectedNodeId : true;
          const isNeighbor = neighborSet ? neighborSet.has(gNode.id) : true;
          const isDimmed = neighborSet ? !isSelected && !isNeighbor : false;

          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Draw glow ring for selected node
          if (isSelected && selectedNodeId) {
            const glowRadius = Math.max(14 / globalScale, 6);
            ctx.beginPath();
            ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
            ctx.fillStyle = (gNode.factionColor || '#8B4513') + '22';
            ctx.fill();
            ctx.strokeStyle = (gNode.factionColor || '#8B4513') + '55';
            ctx.lineWidth = Math.max(1.5 / globalScale, 0.8);
            ctx.stroke();
          }

          // Draw circle for the node
          const baseRadius = isSelected && selectedNodeId ? 8 : 6;
          const radius = Math.max(baseRadius / globalScale, 3);

          ctx.globalAlpha = isDimmed ? 0.15 : (isNeighbor && neighborSet ? 0.85 : 1);
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = gNode.factionColor || '#8B4513';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = Math.max(0.5 / globalScale, 0.5);
          ctx.stroke();

          // Draw label below (only for non-dimmed nodes)
          if (!isDimmed && globalScale > 0.6) {
            ctx.globalAlpha = isDimmed ? 0.15 : 1;
            ctx.fillStyle = '#333';
            ctx.fillText(label, x, y + radius + fontSize * 1.2);
          }

          // Reset alpha
          ctx.globalAlpha = 1;
        }}
        linkLabel={(link) => {
          const l = link as unknown as GraphLink;
          return l.type;
        }}
        linkDirectionalArrowLength={4}
        linkColor={(link) => {
          if (!selectedNodeId) return 'rgba(100,100,100,0.3)';
          const srcId = typeof link.source === 'string' ? link.source : (link.source as ForceGraphNode).id;
          const tgtId = typeof link.target === 'string' ? link.target : (link.target as ForceGraphNode).id;
          if (srcId === selectedNodeId || tgtId === selectedNodeId) return 'rgba(26,35,126,0.7)';
          return 'rgba(100,100,100,0.08)';
        }}
        linkWidth={(link) => {
          if (!selectedNodeId) return 1;
          const srcId = typeof link.source === 'string' ? link.source : (link.source as ForceGraphNode).id;
          const tgtId = typeof link.target === 'string' ? link.target : (link.target as ForceGraphNode).id;
          if (srcId === selectedNodeId || tgtId === selectedNodeId) return 2.5;
          return 0.5;
        }}
        onNodeClick={(node) => {
          const n = node as unknown as ForceGraphNode;
          if (selectedNodeId === n.id) {
            handleNodeSelect(null);
          } else {
            handleNodeSelect(n.id);
          }
        }}
        onBackgroundClick={() => {
          handleNodeSelect(null);
        }}
        onNodeHover={(node) => setHoverNode(node ? (node as unknown as ForceGraphNode) : null)}
        backgroundColor="#faf3e0"
        cooldownTicks={100}
      />

    </Box>
  );
};

export default RelationGraph;
