import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import RelationshipClusterNode from './RelationshipClusterNode';
import ClusterEntityNode from './ClusterEntityNode';

export const nodeTypes = {
  customNode: CustomNode,
  relationshipCluster: RelationshipClusterNode,
  clusterEntity: ClusterEntityNode,
};

export const edgeTypes = {
  customEdge: CustomEdge,
};
