declare module '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions' {
    export default class MapboxDirections {
        constructor(options?: any);
        on(event: string, callback: (data: any) => void): this;
        setOrigin(query: string | [number, number]): void;
        setDestination(query: string | [number, number]): void;
        removeRoutes(): void;
        addControl(control: any): any;
        addTo(map: any): any;
    }
}
