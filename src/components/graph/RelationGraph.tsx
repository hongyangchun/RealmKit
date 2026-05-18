/**
 * RelationGraph - 力导向关系网络图
 * 使用 react-force-graph-2d 渲染
 */
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphData } from 'force-graph';
import { useWorldStore } from '../../store/worldStore';
import { RELATION_COLORS } from '../../constants/relationTypes';
import { relationStyle } from '../../theme/narrativeTokens';
import { useSFX } from '../../hooks/useSFX';
import GraphControls from './GraphControls';

interface RelationGraphProps {
  onNodeSelect?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  /** 搜索文本，用于按名字/标题过滤节点 */
  searchText?: string;
  /** 过滤后节点数量回调，用于宿主页面显示计数 */
  onVisibleCountChange?: (count: number) => void;
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
  const sfx = useSFX();

  const { searchText = '', onVisibleCountChange } = props;

  const isControlled = 'onNodeSelect' in props && props.onNodeSelect !== undefined;
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedNodeId = isControlled ? (props.selectedNodeId ?? null) : internalSelectedId;

  const [selectedFactions, setSelectedFactions] = useState<string[]>(factions.map((f) => f.id));
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>([]);
  const [hoverNode, setHoverNode] = useState<ForceGraphNode | null>(null);

  // Sync selectedFactions when factions data changes (add/delete)
  useEffect(() => {
    setSelectedFactions((prev) => {
      const currentIds = new Set(factions.map((f) => f.id));
      // Remove IDs that no longer exist, add new ones
      const filtered = prev.filter((id) => currentIds.has(id));
      const filteredSet = new Set(filtered);
      for (const id of currentIds) {
        if (!filteredSet.has(id)) filtered.push(id);
      }
      return filtered;
    });
  }, [factions]);

  // Ref for onVisibleCountChange to avoid unnecessary re-renders
  const onVisibleCountChangeRef = useRef(onVisibleCountChange);
  onVisibleCountChangeRef.current = onVisibleCountChange;

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    if (isControlled && props.onNodeSelect) {
      props.onNodeSelect(nodeId);
    } else {
      setInternalSelectedId(nodeId);
    }
  }, [isControlled, props.onNodeSelect]);

  // Build graph data with filtering
  const graphData: GraphData = useMemo(() => {
    const lowerSearch = searchText.toLowerCase();

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

      // Search filter: match name, bio, title, traits, skills
      if (lowerSearch) {
        const haystack = [
          char.name,
          char.bio,
          char.title ?? '',
          ...char.traits,
          ...(char.skills?.map((s: { name: string }) => s.name) ?? []),
        ].join(' ').toLowerCase();
        if (!haystack.includes(lowerSearch)) continue;
      }

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
    const nodeIdSet = new Set(nodes.map((n) => n.id));
    let links: GraphLink[] = relations
      .filter((r) =>
        nodeIdSet.has(r.sourceId) &&
        nodeIdSet.has(r.targetId) &&
        (selectedRelationTypes.length === 0 || selectedRelationTypes.includes(r.type))
      )
      .map((r) => ({
        source: r.sourceId,
        target: r.targetId,
        type: r.type,
        description: r.description,
      }));

    return { nodes, links };
  }, [characters, factions, relations, selectedFactions, selectedRelationTypes, searchText]);

  // Report visible count to parent
  const graphDataRef = useRef(graphData);
  graphDataRef.current = graphData;
  useEffect(() => {
    onVisibleCountChangeRef.current?.(graphDataRef.current.nodes.length);
  }, [graphData]);

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

  // ── 叙事连线视觉映射 ──
  // 根据关系类型映射连线颜色
  const getRelationColor = useCallback((type: string): string => {
    return RELATION_COLORS[type as keyof typeof RELATION_COLORS] ?? 'rgba(100,100,100,0.3)';
  }, []);

  // 判断关系是否为"敌对"类型
  const isHostile = useCallback((type: string): boolean => {
    return ['宿敌', '背叛者', '对手'].includes(type);
  }, []);

  // 判断关系是否为"亲密"类型
  const isIntimate = useCallback((type: string): boolean => {
    return ['亲人', '家族', '恋人', '挚友'].includes(type);
  }, []);

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

      {/* Hover info — 叙事化人物气泡 */}
      {hoverNode && (
        <Box sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 2,
          p: 1.5,
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderLeft: `3px solid ${hoverNode.factionColor}`,
          maxWidth: 220,
        }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: hoverNode.factionColor }}>
            {hoverNode.name}
          </Typography>
          {hoverNode.avatar && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <img
                src={hoverNode.avatar}
                alt={hoverNode.name}
                style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${hoverNode.factionColor}` }}
              />
            </Box>
          )}
          {/* 显示与选中节点的关系 */}
          {selectedNodeId && selectedNodeId !== hoverNode.id && (() => {
            const rel = relations.find(r =>
              (r.sourceId === selectedNodeId && r.targetId === hoverNode.id) ||
              (r.targetId === selectedNodeId && r.sourceId === hoverNode.id)
            );
            if (!rel) return null;
            return (
              <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                <Typography variant="caption" sx={{ color: getRelationColor(rel.type), fontWeight: 600 }}>
                  {rel.type}
                </Typography>
                {rel.description && (
                  <Typography variant="caption" sx={{ display: 'block', color: '#666', mt: 0.25, fontSize: '0.65rem' }}>
                    {rel.description}
                  </Typography>
                )}
              </Box>
            );
          })()}
        </Box>
      )}

      {/* Force graph */}
      <ForceGraph2D
        graphData={graphData}
        width={undefined}
        height={undefined}
        nodeId="id"
        nodeLabel="name"
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
          return l.description ? `${l.type}: ${l.description}` : l.type;
        }}
        linkDirectionalArrowLength={4}
        linkColor={(link) => {
          const l = link as unknown as GraphLink;
          const type = l.type;

          // 选中节点时高亮相关连线
          if (selectedNodeId) {
            const srcId = typeof l.source === 'string' ? l.source : (l.source as ForceGraphNode).id;
            const tgtId = typeof l.target === 'string' ? l.target : (l.target as ForceGraphNode).id;
            if (srcId === selectedNodeId || tgtId === selectedNodeId) {
              return getRelationColor(type);
            }
            return 'rgba(100,100,100,0.06)';
          }

          // 无选中节点时按类型着色，保持半透明
          const baseColor = getRelationColor(type);
          return baseColor + '80'; // 50% 透明度
        }}
        linkWidth={(link) => {
          const l = link as unknown as GraphLink;
          const type = l.type;

          if (selectedNodeId) {
            const srcId = typeof l.source === 'string' ? l.source : (l.source as ForceGraphNode).id;
            const tgtId = typeof l.target === 'string' ? l.target : (l.target as ForceGraphNode).id;
            if (srcId === selectedNodeId || tgtId === selectedNodeId) {
              // 亲密关系更粗
              return isIntimate(type) ? 3 : 2;
            }
            return 0.3;
          }

          // 默认：亲密关系稍粗
          return isIntimate(type) ? 1.8 : 1;
        }}
        linkLineDash={(link) => {
          const l = link as unknown as GraphLink;
          const type = l.type;
          // 敌对关系用虚线
          if (isHostile(type)) return [6, 3];
          // 师徒关系用点线
          if (type === '师徒') return [2, 4];
          return null;
        }}
        onNodeClick={(node) => {
          const n = node as unknown as ForceGraphNode;
          sfx.play('sfx/graph_node_select');
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
