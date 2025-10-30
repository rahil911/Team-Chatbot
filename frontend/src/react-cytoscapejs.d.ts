declare module 'react-cytoscapejs' {
  import type cytoscape from 'cytoscape';
  import type { Component } from 'react';

  interface CytoscapeComponentProps {
    elements: any[];
    style?: React.CSSProperties;
    stylesheet?: any[];
    layout?: any;
    cy?: (cy: any) => void;
    className?: string;
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
}

