/**
 * GPX Parser Tests
 * Tests for GPX file parsing and track point calculations
 */
import { describe, it, expect } from 'vitest';
import { parseGPXFile, findClosestPointOnTrack } from '@/lib/gpx/parser';
import type { GPXTrack } from '@/lib/gpx/parser';

// Sample GPX file content
const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Test Route</name>
    <desc>A test GPX route</desc>
    <time>2024-12-25T10:00:00Z</time>
  </metadata>
  <trk>
    <name>Main Track</name>
    <trkseg>
      <trkpt lat="41.3851" lon="2.1734">
        <ele>10</ele>
        <time>2024-12-25T10:00:00Z</time>
      </trkpt>
      <trkpt lat="41.3852" lon="2.1735">
        <ele>15</ele>
        <time>2024-12-25T10:01:00Z</time>
      </trkpt>
      <trkpt lat="41.3853" lon="2.1736">
        <ele>12</ele>
        <time>2024-12-25T10:02:00Z</time>
      </trkpt>
      <trkpt lat="41.3854" lon="2.1737">
        <ele>20</ele>
        <time>2024-12-25T10:03:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
  <wpt lat="41.3852" lon="2.1735">
    <name>Aid Station</name>
    <desc>Water point</desc>
    <ele>15</ele>
  </wpt>
</gpx>`;

const minimalGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Minimal Track</name>
    <trkseg>
      <trkpt lat="40.0" lon="3.0">
        <ele>100</ele>
      </trkpt>
      <trkpt lat="40.01" lon="3.01">
        <ele>105</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('GPX Parser', () => {
  describe('parseGPXFile', () => {
    it('should parse a valid GPX file with metadata', async () => {
      const result = await parseGPXFile(sampleGPX);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.name).toBe('Test Route');
      expect(result.metadata?.desc).toBe('A test GPX route');
      expect(result.metadata?.time).toBeInstanceOf(Date);
    });

    it('should extract track data correctly', async () => {
      const result = await parseGPXFile(sampleGPX);

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].name).toBe('Main Track');
      expect(result.tracks[0].points).toHaveLength(4);
    });

    it('should parse track points with coordinates and elevation', async () => {
      const result = await parseGPXFile(sampleGPX);
      const firstPoint = result.tracks[0].points[0];

      expect(firstPoint.lat).toBe(41.3851);
      expect(firstPoint.lon).toBe(2.1734);
      expect(firstPoint.ele).toBe(10);
      expect(firstPoint.time).toBeInstanceOf(Date);
    });

    it('should calculate cumulative distance from start', async () => {
      const result = await parseGPXFile(sampleGPX);
      const points = result.tracks[0].points;

      // First point should have 0 distance
      expect(points[0].distanceFromStart).toBe(0);

      // Subsequent points should have increasing distance
      expect(points[1].distanceFromStart).toBeGreaterThan(0);
      expect(points[2].distanceFromStart).toBeGreaterThan(points[1].distanceFromStart!);
      expect(points[3].distanceFromStart).toBeGreaterThan(points[2].distanceFromStart!);
    });

    it('should extract waypoints', async () => {
      const result = await parseGPXFile(sampleGPX);

      expect(result.waypoints).toHaveLength(1);
      expect(result.waypoints[0].name).toBe('Aid Station');
      expect(result.waypoints[0].desc).toBe('Water point');
      expect(result.waypoints[0].lat).toBe(41.3852);
      expect(result.waypoints[0].lon).toBe(2.1735);
      expect(result.waypoints[0].ele).toBe(15);
    });

    it('should calculate total distance correctly', async () => {
      const result = await parseGPXFile(sampleGPX);

      expect(result.stats.totalDistanceKm).toBeGreaterThan(0);
      // Should be approximately the distance of 4 points close together
      expect(result.stats.totalDistanceKm).toBeLessThan(1); // Less than 1km for such close points
    });

    it('should calculate elevation gain correctly', async () => {
      const result = await parseGPXFile(sampleGPX);

      // Elevation goes: 10 -> 15 (+5) -> 12 (-3) -> 20 (+8)
      // Total gain should be 5 + 8 = 13
      expect(result.stats.totalElevationGainM).toBe(13);
    });

    it('should calculate elevation loss correctly', async () => {
      const result = await parseGPXFile(sampleGPX);

      // Elevation goes: 10 -> 15 (+5) -> 12 (-3) -> 20 (+8)
      // Total loss should be 3
      expect(result.stats.totalElevationLossM).toBe(3);
    });

    it('should calculate max elevation', async () => {
      const result = await parseGPXFile(sampleGPX);

      expect(result.stats.maxElevationM).toBe(20);
    });

    it('should calculate min elevation', async () => {
      const result = await parseGPXFile(sampleGPX);

      expect(result.stats.minElevationM).toBe(10);
    });

    it('should handle GPX without waypoints', async () => {
      const result = await parseGPXFile(minimalGPX);

      expect(result.waypoints).toHaveLength(0);
    });

    it('should handle GPX without metadata', async () => {
      const result = await parseGPXFile(minimalGPX);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.name).toBeUndefined();
      expect(result.metadata?.desc).toBeUndefined();
    });

    it('should handle tracks without elevation data', async () => {
      const noElevationGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>No Elevation</name>
    <trkseg>
      <trkpt lat="40.0" lon="3.0"></trkpt>
      <trkpt lat="40.01" lon="3.01"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = await parseGPXFile(noElevationGPX);

      expect(result.stats.totalElevationGainM).toBe(0);
      expect(result.stats.totalElevationLossM).toBe(0);
      expect(result.stats.maxElevationM).toBe(-Infinity); // No elevations
      expect(result.stats.minElevationM).toBe(Infinity); // No elevations
    });

    it('should throw error for invalid XML', async () => {
      const invalidXML = 'This is not XML';

      await expect(parseGPXFile(invalidXML)).rejects.toThrow();
    });

    it('should handle empty track segments', async () => {
      const emptyGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Empty Track</name>
    <trkseg></trkseg>
  </trk>
</gpx>`;

      const result = await parseGPXFile(emptyGPX);

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].points).toHaveLength(0);
      expect(result.stats.totalDistanceKm).toBe(0);
    });
  });

  describe('findClosestPointOnTrack', () => {
    const mockTrack: GPXTrack = {
      name: 'Test Track',
      points: [
        { lat: 41.3851, lon: 2.1734, ele: 10, distanceFromStart: 0 },
        { lat: 41.3852, lon: 2.1735, ele: 15, distanceFromStart: 0.15 },
        { lat: 41.3853, lon: 2.1736, ele: 12, distanceFromStart: 0.30 },
        { lat: 41.3854, lon: 2.1737, ele: 20, distanceFromStart: 0.45 },
      ],
    };

    it('should find exact point when coordinates match', () => {
      const result = findClosestPointOnTrack(mockTrack, 41.3852, 2.1735);

      expect(result).not.toBeNull();
      expect(result?.lat).toBe(41.3852);
      expect(result?.lon).toBe(2.1735);
      expect(result?.ele).toBe(15);
    });

    it('should find closest point when coordinates are nearby', () => {
      // Coordinates close to second point
      const result = findClosestPointOnTrack(mockTrack, 41.38515, 2.17345);

      expect(result).not.toBeNull();
      expect(result?.lat).toBe(41.3852);
      expect(result?.lon).toBe(2.1735);
    });

    it('should find first point when target is before start', () => {
      const result = findClosestPointOnTrack(mockTrack, 41.3850, 2.1733);

      expect(result).not.toBeNull();
      expect(result?.lat).toBe(41.3851);
      expect(result?.lon).toBe(2.1734);
    });

    it('should find last point when target is after end', () => {
      const result = findClosestPointOnTrack(mockTrack, 41.3855, 2.1738);

      expect(result).not.toBeNull();
      expect(result?.lat).toBe(41.3854);
      expect(result?.lon).toBe(2.1737);
    });

    it('should return null for empty track', () => {
      const emptyTrack: GPXTrack = {
        name: 'Empty',
        points: [],
      };

      const result = findClosestPointOnTrack(emptyTrack, 41.3851, 2.1734);

      expect(result).toBeNull();
    });

    it('should handle single point track', () => {
      const singlePointTrack: GPXTrack = {
        name: 'Single',
        points: [{ lat: 41.3851, lon: 2.1734, ele: 10, distanceFromStart: 0 }],
      };

      const result = findClosestPointOnTrack(singlePointTrack, 41.3900, 2.1800);

      expect(result).not.toBeNull();
      expect(result?.lat).toBe(41.3851);
      expect(result?.lon).toBe(2.1734);
    });

    it('should preserve all point properties', () => {
      const pointWithTime: GPXTrack = {
        name: 'With Time',
        points: [
          {
            lat: 41.3851,
            lon: 2.1734,
            ele: 10,
            time: new Date('2024-12-25T10:00:00Z'),
            distanceFromStart: 0,
          },
        ],
      };

      const result = findClosestPointOnTrack(pointWithTime, 41.3851, 2.1734);

      expect(result).not.toBeNull();
      expect(result?.time).toBeInstanceOf(Date);
      expect(result?.distanceFromStart).toBe(0);
    });
  });

  // Tests for missing elevation data
  describe('parseGPXFile - Missing elevations', () => {
    it('should handle GPX files with missing elevation data', async () => {
      const gpxWithMissingEle = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Test Track</name>
            <trkseg>
              <trkpt lat="46.62417" lon="8.03433">
                <ele>1030</ele>
                <time>2024-12-25T10:00:00Z</time>
              </trkpt>
              <trkpt lat="46.6244" lon="8.03435">
                <time>2024-12-25T10:01:00Z</time>
              </trkpt>
              <trkpt lat="46.62436" lon="8.03463">
                <ele>1033</ele>
                <time>2024-12-25T10:02:00Z</time>
              </trkpt>
              <trkpt lat="46.62432" lon="8.03479">
                <time>2024-12-25T10:03:00Z</time>
              </trkpt>
              <trkpt lat="46.62428" lon="8.03488">
                <ele>1035</ele>
                <time>2024-12-25T10:04:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`;

      const result = await parseGPXFile(gpxWithMissingEle);

      // Should have all track points (including those without elevation)
      expect(result.tracks[0].points.length).toBe(5);

      // Should calculate elevation gain only from valid points (1030, 1033, 1035)
      // With threshold filtering, should not be absurdly high
      expect(result.stats.totalElevationGainM).toBeGreaterThan(0);
      expect(result.stats.totalElevationGainM).toBeLessThan(100); // Not 2000+ from artificial 0 values

      // Stats should only consider points with elevation
      expect(result.stats.maxElevationM).toBe(1035);
      expect(result.stats.minElevationM).toBe(1030);

      // Track should have metadata
      expect(result.tracks[0].name).toBe('Test Track');
    });

    it('should return zero elevation gain if all elevations are missing', async () => {
      const gpxNoElevations = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>No Elevation Track</name>
            <trkseg>
              <trkpt lat="46.62417" lon="8.03433">
                <time>2024-12-25T10:00:00Z</time>
              </trkpt>
              <trkpt lat="46.6244" lon="8.03435">
                <time>2024-12-25T10:01:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`;

      const result = await parseGPXFile(gpxNoElevations);

      // Should have track points
      expect(result.tracks[0].points.length).toBe(2);

      // Should have zero elevation gain/loss (no elevation data to calculate from)
      expect(result.stats.totalElevationGainM).toBe(0);
      expect(result.stats.totalElevationLossM).toBe(0);

      // Min/max should be infinity values (no elevations to compare)
      expect(result.stats.maxElevationM).toBe(-Infinity);
      expect(result.stats.minElevationM).toBe(Infinity);
    });

    it('should not create artificial elevation changes from missing data', async () => {
      // This test ensures we don't treat missing elevations as 0m
      const gpxAlternatingElevations = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Alternating Track</name>
            <trkseg>
              <trkpt lat="46.62417" lon="8.03433"><ele>2000</ele></trkpt>
              <trkpt lat="46.6244" lon="8.03435"></trkpt>
              <trkpt lat="46.62436" lon="8.03463"><ele>2010</ele></trkpt>
              <trkpt lat="46.62432" lon="8.03479"></trkpt>
              <trkpt lat="46.62428" lon="8.03488"><ele>2020</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

      const result = await parseGPXFile(gpxAlternatingElevations);

      // Should only calculate gain from actual elevations: 2000 → 2010 → 2020
      // Total gain should be ~20m (with threshold filtering)
      // NOT 4000+m from treating missing as 0
      expect(result.stats.totalElevationGainM).toBeGreaterThan(0);
      expect(result.stats.totalElevationGainM).toBeLessThan(50);

      // Max/min should be from actual data
      expect(result.stats.maxElevationM).toBe(2020);
      expect(result.stats.minElevationM).toBe(2000);
    });
  });
});
