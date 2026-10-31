import React, { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Etape } from '../types/etape'
import { Transition } from '../types/transition'

interface WorkflowDiagrammeProps {
  etapes: Etape[]
  transitions: Transition[]
}

const WorkflowDiagramme: React.FC<WorkflowDiagrammeProps> = ({ etapes, transitions }) => {
  // === Génération des nœuds à partir des étapes ===
  const nodes: Node[] = useMemo(() => {
    return etapes.map((etape, index) => ({
      id: etape.id!,
      data: { label: etape.libelle },
      position: { x: 150 * index, y: (index % 2) * 150 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        border: '2px solid #1976d2',
        padding: 10,
        borderRadius: 8,
        background: '#f5faff',
        fontWeight: 'bold',
      },
    }))
  }, [etapes])

  // === Génération des liens (edges) à partir des transitions ===
  const edges: Edge[] = useMemo(() => {
    return transitions.map((t) => ({
      id: t.id!,
      source: t.source_etape_id!,
      target: t.cible_etape_id!,
      label: t.libelle,
      animated: true,
      style: { stroke: '#1976d2', strokeWidth: 2 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
      labelBgStyle: { fill: '#fff', color: '#1976d2' },
    }))
  }, [transitions])

  return (
    <div style={{ width: '100%', height: '500px', borderRadius: 8, border: '1px solid #ccc' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#e0e0e0" gap={16} />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default WorkflowDiagramme
