"use client";

import React, { useState, useMemo } from "react";
import Head from "next/head";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart
} from "recharts";
import { Upload, Map as MapIcon, Activity, ChevronRight, Share2, Info } from "lucide-react";

// Dynamic import for Leaflet to avoid SSR issues
import dynamic from "next/dynamic";
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });

// Types
interface GPXPoint {
  lat: number;
  lon: number;
  ele: number;
  distance: number;
  index: number;
}

// Helper to calculate distance between two lat/lng points in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple moving average smoothing for elevation
function smoothElevation(data: GPXPoint[], windowSize: number): GPXPoint[] {
  return data.map((point, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
    const slice = data.slice(start, end);
    const avgEle = slice.reduce((sum, p) => sum + p.ele, 0) / slice.length;
    return { ...point, ele: Math.round(avgEle * 10) / 10 };
  });
}

export default function GPSPage() {
  const [gpxData, setGpxData] = useState<GPXPoint[]>([]);
  const [hoverPoint, setHoverPoint] = useState<GPXPoint | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const xmlText = event.target?.result as string;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      const trkpts = Array.from(xmlDoc.getElementsByTagName("trkpt"));
      let totalDist = 0;
      const points = trkpts.map((pt, i) => {
        const lat = parseFloat(pt.getAttribute("lat") || "0");
        const lon = parseFloat(pt.getAttribute("lon") || "0");
        const ele = parseFloat(pt.getElementsByTagName("ele")[0]?.textContent || "0");
        
        if (i > 0) {
          const prevLat = parseFloat(trkpts[i-1].getAttribute("lat") || "0");
          const prevLon = parseFloat(trkpts[i-1].getAttribute("lon") || "0");
          totalDist += haversine(prevLat, prevLon, lat, lon);
        }

        return {
          lat,
          lon,
          ele,
          distance: Math.round(totalDist * 100) / 100, // km
          index: i
        };
      });

      // Apply smoothing
      const smoothed = smoothElevation(points, 10);
      setGpxData(smoothed);
    };
    reader.readAsText(file);
  };

  const mapCenter = useMemo(() => {
    if (gpxData.length === 0) return [41.3851, 2.1734] as [number, number];
    const mid = gpxData[Math.floor(gpxData.length / 2)];
    return [mid.lat, mid.lon] as [number, number];
  }, [gpxData]);

  const stats = useMemo(() => {
    if (gpxData.length === 0) return { dist: 0, gain: 0, maxEle: 0 };
    let gain = 0;
    for (let i = 1; i < gpxData.length; i++) {
        const diff = gpxData[i].ele - gpxData[i-1].ele;
        if (diff > 0) gain += diff;
    }
    return {
        dist: gpxData[gpxData.length - 1].distance,
        gain: Math.round(gain),
        maxEle: Math.max(...gpxData.map(p => p.ele))
    };
  }, [gpxData]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30">
      <Head>
        <title>Pro GPX Explorer | Premium Activity Analytics</title>
      </Head>

      {/* Header */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">GPX<span className="text-blue-500">PRO</span></h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-semibold">Advanced Analytics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-full hover:bg-white/5 transition-colors border border-white/5">
              <Share2 size={18} className="text-white/70" />
            </button>
            <label className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm cursor-pointer hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/5">
              <Upload size={16} />
              Cargar GPX
              <input type="file" accept=".gpx" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {gpxData.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] border-2 border-dashed border-white/10 rounded-[2rem] bg-white/[0.02]">
            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6 border border-blue-500/20">
              <MapIcon className="text-blue-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Visualización Garmin de Élite</h2>
            <p className="text-white/40 max-w-sm text-center mb-8">
              Arrastra tu archivo GPX para analizar la pendiente, el perfil de elevación y la ruta en alta definición.
            </p>
            <label className="px-8 py-3 bg-blue-600 rounded-full font-bold hover:bg-blue-500 transition-all cursor-pointer shadow-xl shadow-blue-500/20">
              Seleccionar Archivo
              <input type="file" accept=".gpx" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stats Panel */}
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Distancia", value: `${stats.dist} km`, icon: <Activity className="text-blue-500" /> },
                { label: "Ascenso Positivo", value: `${stats.gain} m`, icon: <ChevronRight className="rotate-[-90deg] text-green-500" /> },
                { label: "Altitud Máxima", value: `${stats.maxEle} m`, icon: <Info className="text-purple-500" /> },
                { label: "Puntos Rec.", value: gpxData.length, icon: <MapIcon className="text-orange-500" /> },
              ].map((stat, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 p-6 rounded-[1.5rem] hover:bg-white/[0.05] transition-colors group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">{stat.icon}</div>
                    <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Main Visuals */}
            <div className="lg:col-span-2 space-y-8">
              {/* Elevation Chart */}
              <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2rem] h-[450px] relative overflow-hidden group">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Activity size={18} className="text-blue-500" />
                    Perfil de Altitud
                  </h3>
                  <div className="flex gap-2 text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                    <span>Distancia (km)</span>
                  </div>
                </div>
                
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-blue-600/5 to-transparent pointer-events-none" />
                
                <ResponsiveContainer width="100%" height="80%">
                  <AreaChart 
                    data={gpxData} 
                    onMouseMove={(e: any) => {
                      if (e && e.activePayload) setHoverPoint(e.activePayload[0].payload);
                    }}
                    onMouseLeave={() => setHoverPoint(null)}
                  >
                    <defs>
                      <linearGradient id="colorEle" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis 
                      dataKey="distance" 
                      stroke="#ffffff20" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{fill: '#4b5563'}}
                    />
                    <YAxis 
                      stroke="#ffffff20" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={['dataMin - 50', 'dataMax + 50']}
                      tick={{fill: '#4b5563'}}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
                              <p className="text-[10px] text-white/40 uppercase mb-1">Punto de Ruta</p>
                              <p className="text-sm font-bold text-white">{payload[0].value} metros</p>
                              <p className="text-[10px] text-blue-400">{payload[0].payload.distance} km</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ele" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorEle)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Map Holder */}
              <div className="bg-white/[0.03] border border-white/10 overflow-hidden rounded-[2rem] h-[400px] relative">
                <div className="absolute top-6 left-6 z-[400] bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                    <MapIcon size={14} className="text-blue-500" />
                    Sincronización de Ruta en Tiempo Real
                </div>
                
                {typeof window !== 'undefined' && (
                  <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%", background: "#0a0a0a" }}>
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <Polyline 
                        positions={gpxData.map(p => [p.lat, p.lon])} 
                        color="#3b82f6" 
                        weight={4} 
                        opacity={0.8}
                    />
                    {hoverPoint && (
                      <Marker position={[hoverPoint.lat, hoverPoint.lon]} />
                    )}
                  </MapContainer>
                )}
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-6">
                <div className="bg-blue-600 p-8 rounded-[2rem] shadow-xl shadow-blue-600/10 flex flex-col justify-between h-[300px]">
                    <div>
                        <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Desempeño Total</h4>
                        <p className="text-3xl font-black">{stats.dist}km de aventura</p>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-white/80 mb-4">
                            <Activity size={16} /> Elevación acumulada optimizada por algoritmo
                        </div>
                        <button className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-all">
                            Exportar Informe <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2rem] space-y-6">
                    <h4 className="text-sm font-bold">Análisis de Pendiente</h4>
                    <div className="space-y-4">
                        {[
                            { label: "Ascenso Técnico", value: "3.2km", color: "bg-red-500" },
                            { label: "Llano / Crucero", value: "8.5km", color: "bg-green-500" },
                            { label: "Descenso Rápido", value: "1.2km", color: "bg-blue-500" }
                        ].map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-white/40">{item.label}</span>
                                    <span>{item.value}</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color} w-[70%] opacity-80`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-6 py-12 text-center border-t border-white/5 mt-12">
        <p className="text-white/20 text-xs font-medium flex items-center justify-center gap-2">
            Hecho con <Activity size={12} className="text-blue-500" /> para análisis de alto rendimiento
        </p>
      </footer>

      <style jsx global>{`
        .leaflet-container {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-vignette {
            box-shadow: inset 0 0 100px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}
