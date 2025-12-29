declare module 'gpx-parser-builder' {
  export default class GPX {
    $: {
      version: string;
      creator: string;
      xmlns: string;
      'xmlns:xsi': string;
      'xsi:schemaLocation': string;
    };
    metadata?: {
      name?: string;
      desc?: string;
      time?: Date;
    };
    wpt?: Array<{
      $: { lat: number; lon: number };
      ele?: number;
      time?: Date;
      name?: string;
      desc?: string;
      sym?: string;
      type?: string;
    }>;
    rte?: Array<any>;
    trk?: Array<{
      name?: string;
      cmt?: string;
      desc?: string;
      trkseg: Array<{
        trkpt: Array<{
          $: { lat: number; lon: number };
          ele?: number;
          time?: Date;
        }>;
      }>;
    }>;
    extensions?: any;

    constructor(object: any);
    static parse(gpxString: string, options?: any): GPX;
    toString(options?: any): string;
  }
}
