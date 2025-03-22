import React, { useRef, useState, useEffect, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Submission } from '@shared/schema';

// Country coordinates for common locations
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'France': { lat: 46.2276, lng: 2.2137 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'Italy': { lat: 41.8719, lng: 12.5674 },
  'Spain': { lat: 40.4637, lng: -3.7492 },
  'Netherlands': { lat: 52.1326, lng: 5.2913 },
  'Belgium': { lat: 50.5039, lng: 4.4699 },
  'Switzerland': { lat: 46.8182, lng: 8.2275 },
  'Austria': { lat: 47.5162, lng: 14.5501 },
  'Poland': { lat: 51.9194, lng: 19.1451 },
  'Sweden': { lat: 60.1282, lng: 18.6435 },
  'Denmark': { lat: 56.2639, lng: 9.5018 },
  'Norway': { lat: 60.4720, lng: 8.4689 },
  'Finland': { lat: 61.9241, lng: 25.7482 },
  'United States': { lat: 37.0902, lng: -95.7129 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
  'Mexico': { lat: 23.6345, lng: -102.5528 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'Australia': { lat: -25.2744, lng: 133.7751 }
};

interface GlobeMapProps {
  submissions: Submission[];
  isLoading: boolean;
}

interface PointData {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
  value: number;
  submissions: number;
}

export function GlobeMap({ submissions, isLoading }: GlobeMapProps) {
  const globeRef = useRef<any>();
  const [globeReady, setGlobeReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Process data for globe visualization
  const pointsData = useMemo(() => {
    if (!submissions?.length) return [];
    
    // Group submissions by country
    const countryGroups = submissions.reduce((acc, submission) => {
      const country = submission.country;
      if (!country) return acc;
      
      if (!acc[country]) {
        acc[country] = {
          count: 0,
          totalCO2: 0,
          totalValue: 0,
          totalBuildings: 0,
          totalSize: 0
        };
      }
      
      acc[country].count += 1;
      acc[country].totalCO2 += Number(submission.co2Savings) || 0;
      acc[country].totalValue += Number(submission.financialValue) || 0;
      acc[country].totalBuildings += 1;
      acc[country].totalSize += Number(submission.buildingSize) || 0;
      
      return acc;
    }, {} as Record<string, { 
      count: number; 
      totalCO2: number; 
      totalValue: number; 
      totalBuildings: number;
      totalSize: number;
    }>);
    
    // Convert to points data
    return Object.entries(countryGroups).map(([country, data]) => {
      const coordinates = COUNTRY_COORDINATES[country] || { lat: 0, lng: 0 };
      
      // Calculate marker size based on number of submissions (clamped)
      const size = Math.max(Math.min(data.count * 0.5, 5), 1.5);
      
      // Color based on CO2 savings intensity (green with varying opacity)
      const averageCO2 = data.totalCO2 / data.count;
      const colorIntensity = Math.min(0.2 + (averageCO2 / 100), 1);
      
      return {
        lat: coordinates.lat,
        lng: coordinates.lng,
        size,
        color: `rgba(0, 128, 0, ${colorIntensity})`,
        label: country,
        value: Math.round(data.totalCO2 * 10) / 10,
        submissions: data.count
      };
    }).filter(point => point.lat !== 0 && point.lng !== 0);
  }, [submissions]);

  // Adjust globe size on component mount and window resize
  useEffect(() => {
    const updateSize = () => {
      // Responsive sizing
      const container = document.getElementById('globe-container');
      if (container) {
        const width = container.clientWidth;
        const height = Math.min(width * 0.6, 500); // Aspect ratio control
        setDimensions({ width, height });
      }
    };

    // Initial size
    updateSize();
    
    // Add resize listener
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize globe rotation
  useEffect(() => {
    if (globeRef.current && globeReady) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      
      // Set initial position to Europe
      globeRef.current.pointOfView({ lat: 48.8566, lng: 2.3522, altitude: 2.5 }, 1000);
    }
  }, [globeReady]);

  return (
    <Card className="transition-all duration-200">
      <CardHeader>
        <CardTitle>Global Impact Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div id="globe-container" className="relative w-full overflow-hidden">
          {isLoading ? (
            <Skeleton className="w-full h-[400px] rounded-md" />
          ) : (
            <Globe
              ref={globeRef}
              width={dimensions.width}
              height={dimensions.height}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              pointsData={pointsData}
              pointLabel={d => `
                <div style="text-align:center; color:white; background:rgba(0,0,0,0.75); padding:10px; border-radius:5px;">
                  <div style="font-weight:bold; margin-bottom:5px;">${(d as PointData).label}</div>
                  <div>CO₂ Savings: ${(d as PointData).value} tons</div>
                  <div>Submissions: ${(d as PointData).submissions}</div>
                </div>
              `}
              pointRadius="size"
              pointColor="color"
              pointAltitude={0.01}
              pointsMerge={true}
              atmosphereColor="rgba(120, 160, 240, 0.3)"
              atmosphereAltitude={0.25}
              onGlobeReady={() => setGlobeReady(true)}
              backgroundColor="rgba(0,0,0,0)"
              waitForGlobeReady={true}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}