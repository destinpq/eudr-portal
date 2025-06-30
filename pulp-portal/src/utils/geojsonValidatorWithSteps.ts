// GeoJSON Validator with step-by-step rule logging for UI feedback
// Usage: import { validateGeoJSONWithSteps } from './geojsonValidatorWithSteps';

export interface ValidationStep {
  rule: string;
  passed: boolean;
  message: string;
}

export interface ValidationResultWithSteps {
  isValid: boolean;
  errors: string[];
  steps: ValidationStep[];
}

export interface PerPlotValidationResult {
  plotId: string;
  farmer: string;
  isValid: boolean;
  errors: string[];
  steps: ValidationStep[];
}

export function validateGeoJSONWithSteps(
  geojson: any
): ValidationResultWithSteps {
  const results: ValidationResultWithSteps = {
    isValid: true,
    errors: [],
    steps: [],
  };

  // Rule 1: Root type must be "FeatureCollection"
  if (!geojson || typeof geojson !== "object") {
    addStep(results, "Root type", false, "GeoJSON must be a valid object");
    addError(results, "GeoJSON must be a valid object");
    return results;
  } else if (geojson.type !== "FeatureCollection") {
    addStep(
      results,
      "Root type",
      false,
      "Root type must be 'FeatureCollection'"
    );
    addError(results, "Root type must be 'FeatureCollection'");
    return results;
  } else {
    addStep(results, "Root type", true, "Root type is 'FeatureCollection'");
  }

  // Rule 2: "features" must be a non-empty array
  if (!Array.isArray(geojson.features) || geojson.features.length === 0) {
    addStep(
      results,
      "Features array",
      false,
      "'features' must be a non-empty array"
    );
    addError(results, "'features' must be a non-empty array");
    return results;
  } else {
    addStep(results, "Features array", true, "'features' is a non-empty array");
  }

  geojson.features.forEach((feature: any, index: number) => {
    validateFeatureWithSteps(feature, index, results);
  });

  return results;
}

export function validateAllPlotsWithSteps(
  geojson: any
): PerPlotValidationResult[] {
  if (
    !geojson ||
    typeof geojson !== "object" ||
    geojson.type !== "FeatureCollection" ||
    !Array.isArray(geojson.features)
  ) {
    return [];
  }
  return geojson.features.map((feature: any, index: number) => {
    const stepsResult: ValidationResultWithSteps = {
      isValid: true,
      errors: [],
      steps: [],
    };
    validateFeatureWithSteps(feature, index, stepsResult);
    return {
      plotId: feature?.properties?.plot_ID || `Feature ${index}`,
      farmer: feature?.properties?.farmer_name || "",
      isValid: stepsResult.isValid,
      errors: stepsResult.errors,
      steps: stepsResult.steps,
    };
  });
}

function validateFeatureWithSteps(
  feature: any,
  index: number,
  results: ValidationResultWithSteps
) {
  // Rule 3: Each feature must have "type": "Feature"
  if (feature.type !== "Feature") {
    addStep(
      results,
      `Feature ${index} type`,
      false,
      `Feature ${index}: Type must be 'Feature'`
    );
    addError(results, `Feature ${index}: Type must be 'Feature'`);
    return;
  } else {
    addStep(
      results,
      `Feature ${index} type`,
      true,
      `Feature ${index} type is 'Feature'`
    );
  }

  // Rule 17: "properties" must be an object or null
  if (
    !("properties" in feature) ||
    (feature.properties !== null && typeof feature.properties !== "object")
  ) {
    addStep(
      results,
      `Feature ${index} properties`,
      false,
      `Feature ${index}: 'properties' must be an object or null`
    );
    addError(
      results,
      `Feature ${index}: 'properties' must be an object or null`
    );
    return;
  } else {
    addStep(
      results,
      `Feature ${index} properties`,
      true,
      `Feature ${index}: 'properties' is valid`
    );
  }

  // Rule 18: Required properties (example: country ISO2 code, plot_ID, etc.)
  const requiredProps = ["ProducerCountry"];
  requiredProps.forEach((prop) => {
    if (!feature.properties || !(prop in feature.properties)) {
      addStep(
        results,
        `Feature ${index} property ${prop}`,
        false,
        `Feature ${index}: Missing required property '${prop}'`
      );
      addError(
        results,
        `Feature ${index}: Missing required property '${prop}'`
      );
    } else if (feature.properties[prop] === "" || feature.properties[prop] === null || feature.properties[prop] === undefined) {
      addStep(
        results,
        `Feature ${index} property ${prop}`,
        false,
        `Feature ${index}: Property '${prop}' cannot be empty`
      );
      addError(
        results,
        `Feature ${index}: Property '${prop}' cannot be empty`
      );
    } else {
      addStep(
        results,
        `Feature ${index} property ${prop}`,
        true,
        `Feature ${index}: Property '${prop}' is present and valid`
      );
    }
  });

  // Rule 24: Property types must match expectation (example: area should be number)
  if ("area" in feature.properties) {
    if (typeof feature.properties.area !== "number") {
      addStep(
        results,
        `Feature ${index} property area`,
        false,
        `Feature ${index}: 'area' property must be a number`
      );
      addError(results, `Feature ${index}: 'area' property must be a number`);
    } else {
      addStep(
        results,
        `Feature ${index} property area`,
        true,
        `Feature ${index}: 'area' property is a number`
      );
      
      // Rule 25: Area limits based on geometry type (for lowercase 'area')
      const geometryType = feature.geometry?.type;
      let areaLimit = 4; // Default limit for Points and other geometries
      let limitDescription = "4 units (for Point geometries)";
      
      if (geometryType === "Polygon") {
        areaLimit = 50; // Higher limit for Polygons
        limitDescription = "50 units (for Polygon geometries)";
      }
      
      if (feature.properties.area > areaLimit) {
        addStep(
          results,
          `Feature ${index} area limit (lowercase)`,
          false,
          `Feature ${index}: area ${feature.properties.area} exceeds maximum allowed limit of ${limitDescription}`
        );
        addError(results, `Feature ${index}: area ${feature.properties.area} exceeds maximum allowed limit of ${limitDescription}`);
      } else {
        addStep(
          results,
          `Feature ${index} area limit (lowercase)`,
          true,
          `Feature ${index}: area ${feature.properties.area} is within allowed limit of ${limitDescription}`
        );
      }
    }
  }

  // Check for "Area" property (capital A) as well - common in GeoJSON files
  if ("Area" in feature.properties) {
    if (typeof feature.properties.Area !== "number") {
      addStep(
        results,
        `Feature ${index} property Area`,
        false,
        `Feature ${index}: 'Area' property must be a number`
      );
      addError(results, `Feature ${index}: 'Area' property must be a number`);
    } else {
      addStep(
        results,
        `Feature ${index} property Area`,
        true,
        `Feature ${index}: 'Area' property is a number`
      );
      
      // Rule 25: Area limits based on geometry type
      const geometryType = feature.geometry?.type;
      let areaLimit = 4; // Default limit for Points and other geometries
      let limitDescription = "4 units (for Point geometries)";
      
      if (geometryType === "Polygon") {
        areaLimit = 50; // Higher limit for Polygons
        limitDescription = "50 units (for Polygon geometries)";
      }
      
      if (feature.properties.Area > areaLimit) {
        addStep(
          results,
          `Feature ${index} area limit`,
          false,
          `Feature ${index}: Area ${feature.properties.Area} exceeds maximum allowed limit of ${limitDescription}`
        );
        addError(results, `Feature ${index}: Area ${feature.properties.Area} exceeds maximum allowed limit of ${limitDescription}`);
      } else {
        addStep(
          results,
          `Feature ${index} area limit`,
          true,
          `Feature ${index}: Area ${feature.properties.Area} is within allowed limit of ${limitDescription}`
        );
      }
    }
  }

  // Rule 21: Geometry type must match platform expectation (only Polygon accepted)
  if (!("geometry" in feature) && feature.geometry !== null) {
    addStep(
      results,
      `Feature ${index} geometry`,
      false,
      `Feature ${index}: Missing 'geometry' property`
    );
    addError(results, `Feature ${index}: Missing 'geometry' property`);
    return;
  }
  if (feature.geometry === null) {
    addStep(
      results,
      `Feature ${index} geometry`,
      true,
      `Feature ${index}: geometry is null (allowed)`
    );
    return;
  }
  validateGeometryWithSteps(feature.geometry, index, results);
}

function validateGeometryWithSteps(
  geometry: any,
  featureIndex: number,
  results: ValidationResultWithSteps
) {
  // Rule 4: Geometry type must be valid
  const validTypes = [
    "Point",
    "LineString",
    "Polygon",
    "MultiPoint",
    "MultiLineString",
    "MultiPolygon",
    "GeometryCollection",
  ];
  if (!geometry.type || !validTypes.includes(geometry.type)) {
    addStep(
      results,
      `Feature ${featureIndex} geometry type`,
      false,
      `Feature ${featureIndex}: Invalid geometry type`
    );
    addError(results, `Feature ${featureIndex}: Invalid geometry type`);
    return;
  } else {
    addStep(
      results,
      `Feature ${featureIndex} geometry type`,
      true,
      `Feature ${featureIndex}: Geometry type is '${geometry.type}'`
    );
  }

  // Rule 21: Only Polygon and Point geometries are accepted for this implementation
  if (geometry.type !== "Polygon" && geometry.type !== "Point") {
    addStep(
      results,
      `Feature ${featureIndex} geometry type`,
      false,
      `Feature ${featureIndex}: Only Polygon and Point geometries are supported`
    );
    addError(
      results,
      `Feature ${featureIndex}: Only Polygon and Point geometries are supported`
    );
    return;
  }

  // Additional validation for Point geometries
  if (geometry.type === "Point") {
    addStep(
      results,
      `Feature ${featureIndex} point geometry validation`,
      true,
      `Feature ${featureIndex}: Point geometry detected - applying point-specific rules`
    );
  }

  // Rule 5: Coordinates must be correctly structured
  if (!Array.isArray(geometry.coordinates)) {
    addStep(
      results,
      `Feature ${featureIndex} coordinates`,
      false,
      `Feature ${featureIndex}: Coordinates must be an array`
    );
    addError(results, `Feature ${featureIndex}: Coordinates must be an array`);
    return;
  } else {
    addStep(
      results,
      `Feature ${featureIndex} coordinates`,
      true,
      `Feature ${featureIndex}: Coordinates are an array`
    );
  }

  if (geometry.type === "Point") {
    validatePointCoordinatesWithSteps(
      geometry.coordinates,
      featureIndex,
      results
    );
  } else {
    validatePolygonCoordinatesWithSteps(
      geometry.coordinates,
      featureIndex,
      results
    );
  }
}

function validatePolygonCoordinatesWithSteps(
  coordinates: any[][][],
  featureIndex: number,
  results: ValidationResultWithSteps
) {
  // Rule 13: No interior rings allowed (holes strictly prohibited)
  if (coordinates.length > 1) {
    addStep(
      results,
      `Feature ${featureIndex} interior rings`,
      false,
      `Feature ${featureIndex}: Interior rings (holes) are not allowed`
    );
    addError(
      results,
      `Feature ${featureIndex}: Interior rings (holes) are not allowed`
    );
    return;
  } else {
    addStep(
      results,
      `Feature ${featureIndex} interior rings`,
      true,
      `Feature ${featureIndex}: No interior rings`
    );
  }
  if (coordinates.length === 0) {
    addStep(
      results,
      `Feature ${featureIndex} exterior ring`,
      false,
      `Feature ${featureIndex}: Polygon must have an exterior ring`
    );
    addError(
      results,
      `Feature ${featureIndex}: Polygon must have an exterior ring`
    );
    return;
  } else {
    addStep(
      results,
      `Feature ${featureIndex} exterior ring`,
      true,
      `Feature ${featureIndex}: Polygon has an exterior ring`
    );
  }
  // Validate the exterior ring
  validateRingWithSteps(coordinates[0], featureIndex, 0, results);
}

function validateRingWithSteps(
  ring: any[][],
  featureIndex: number,
  ringIndex: number,
  results: ValidationResultWithSteps
) {
  // Check if ring is an array
  if (!Array.isArray(ring)) {
    addStep(
      results,
      `Feature ${featureIndex} ring array`,
      false,
      `Feature ${featureIndex}: Ring must be an array of positions`
    );
    addError(
      results,
      `Feature ${featureIndex}: Ring must be an array of positions`
    );
    return;
  } else {
    addStep(
      results,
      `Feature ${featureIndex} ring array`,
      true,
      `Feature ${featureIndex}: Ring is an array of positions`
    );
  }
  // Rule 7: Must have at least 4 points (including closure)
  if (ring.length < 4) {
    addStep(
      results,
      `Feature ${featureIndex} ring points`,
      false,
      `Feature ${featureIndex}: Ring must have at least 4 points`
    );
    addError(
      results,
      `Feature ${featureIndex}: Ring must have at least 4 points`
    );
    return;
  } else {
    addStep(
      results,
      `Feature ${featureIndex} ring points`,
      true,
      `Feature ${featureIndex}: Ring has at least 4 points`
    );
  }
  // Rule 6: Ring must be closed (first/last points identical)
  if (!pointsEqual(ring[0], ring[ring.length - 1])) {
    addStep(
      results,
      `Feature ${featureIndex} ring closure`,
      false,
      `Feature ${featureIndex}: Ring must be closed (first/last points identical)`
    );
    addError(
      results,
      `Feature ${featureIndex}: Ring must be closed (first/last points identical)`
    );
  } else {
    addStep(
      results,
      `Feature ${featureIndex} ring closure`,
      true,
      `Feature ${featureIndex}: Ring is closed`
    );
  }
  // Rule 14: No duplicate consecutive coordinates
  for (let i = 1; i < ring.length; i++) {
    if (pointsEqual(ring[i], ring[i - 1])) {
      addStep(
        results,
        `Feature ${featureIndex} duplicate points`,
        false,
        `Feature ${featureIndex}: Duplicate consecutive points at ${
          i - 1
        } and ${i}`
      );
      addError(
        results,
        `Feature ${featureIndex}: Duplicate consecutive points at ${
          i - 1
        } and ${i}`
      );
    }
  }
  // Rule 16: No zero-length edges (identical adjacent points)
  for (let i = 1; i < ring.length; i++) {
    if (pointsEqual(ring[i], ring[i - 1])) {
      addStep(
        results,
        `Feature ${featureIndex} zero-length edge`,
        false,
        `Feature ${featureIndex}: Zero-length edge at points ${i - 1} and ${i}`
      );
      addError(
        results,
        `Feature ${featureIndex}: Zero-length edge at points ${i - 1} and ${i}`
      );
    }
  }
  // Validate individual coordinates
  ring.forEach((coord, pointIndex) => {
    validateCoordinateWithSteps(
      coord,
      featureIndex,
      ringIndex,
      pointIndex,
      results
    );
  });
  // Rule 12: No self-intersections
  checkSelfIntersectionsWithSteps(ring, featureIndex, results);
  // Rule 15: No spike vertices (angles < 5°)
  checkForSpikesWithSteps(ring, featureIndex, results);
  // Rule 22: No excessive straight lines (enough points for curves)
  checkExcessiveStraightLinesWithSteps(ring, featureIndex, results);
}

function validateCoordinateWithSteps(
  coord: any[],
  featureIndex: number,
  ringIndex: number,
  pointIndex: number,
  results: ValidationResultWithSteps
) {
  // Rule 8: Coordinate format [lon, lat] or [lon, lat, alt]
  if (!Array.isArray(coord) || coord.length < 2 || coord.length > 3) {
    addStep(
      results,
      `Feature ${featureIndex} Point ${pointIndex} format`,
      false,
      `Feature ${featureIndex} Point ${pointIndex}: Invalid coordinate format`
    );
    addError(
      results,
      `Feature ${featureIndex} Point ${pointIndex}: Invalid coordinate format`
    );
    return;
  } else {
    addStep(
      results,
      `Feature ${featureIndex} Point ${pointIndex} format`,
      true,
      `Feature ${featureIndex} Point ${pointIndex}: Coordinate format is valid`
    );
  }
  const [lon, lat] = coord;
  // Rule 9: Longitude must be between -180 and 180
  if (typeof lon !== "number" || lon < -180 || lon > 180) {
    addStep(
      results,
      `Feature ${featureIndex} Point ${pointIndex} longitude`,
      false,
      `Feature ${featureIndex} Point ${pointIndex}: Invalid longitude ${lon}`
    );
    addError(
      results,
      `Feature ${featureIndex} Point ${pointIndex}: Invalid longitude ${lon}`
    );
  } else {
    addStep(
      results,
      `Feature ${featureIndex} Point ${pointIndex} longitude`,
      true,
      `Feature ${featureIndex} Point ${pointIndex}: Longitude is valid`
    );
  }
  // Rule 10: Latitude must be between -90 and 90
  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    addStep(
      results,
      `Feature ${featureIndex} Point ${pointIndex} latitude`,
      false,
      `Feature ${featureIndex} Point ${pointIndex}: Invalid latitude ${lat}`
    );
    addError(
      results,
      `Feature ${featureIndex} Point ${pointIndex}: Invalid latitude ${lat}`
    );
  } else {
    addStep(
      results,
      `Feature ${featureIndex} Point ${pointIndex} latitude`,
      true,
      `Feature ${featureIndex} Point ${pointIndex}: Latitude is valid`
    );
  }
}

function checkSelfIntersectionsWithSteps(
  ring: any[][],
  featureIndex: number,
  results: ValidationResultWithSteps
) {
  let found = false;
  for (let i = 0; i < ring.length - 1; i++) {
    for (let j = i + 2; j < ring.length - 1; j++) {
      if (i === 0 && j === ring.length - 2) continue;
      if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) {
        addStep(
          results,
          `Feature ${featureIndex} self-intersection`,
          false,
          `Feature ${featureIndex}: Self-intersection detected`
        );
        addError(
          results,
          `Feature ${featureIndex}: Self-intersection detected`
        );
        found = true;
        break;
      }
    }
    if (found) break;
  }
  if (!found) {
    addStep(
      results,
      `Feature ${featureIndex} self-intersection`,
      true,
      `Feature ${featureIndex}: No self-intersections`
    );
  }
}

function checkForSpikesWithSteps(
  ring: any[][],
  featureIndex: number,
  results: ValidationResultWithSteps
) {
  let found = false;
  for (let i = 1; i < ring.length - 1; i++) {
    const angle = calculateAngle(ring[i - 1], ring[i], ring[i + 1]);
    if (angle < 5) {
      addStep(
        results,
        `Feature ${featureIndex} spike vertex`,
        false,
        `Feature ${featureIndex}: Spike vertex detected (${angle.toFixed(1)}°)`
      );
      addError(
        results,
        `Feature ${featureIndex}: Spike vertex detected (${angle.toFixed(1)}°)`
      );
      found = true;
    }
  }
  if (!found) {
    addStep(
      results,
      `Feature ${featureIndex} spike vertex`,
      true,
      `Feature ${featureIndex}: No spike vertices`
    );
  }
}

function checkExcessiveStraightLinesWithSteps(
  ring: any[][],
  featureIndex: number,
  results: ValidationResultWithSteps
) {
  // Acceptable: triangle (3 unique points, 4 coordinates with closure)
  if (ring.length === 4 && pointsEqual(ring[0], ring[ring.length - 1])) {
    addStep(
      results,
      `Feature ${featureIndex} straight lines`,
      true,
      `Feature ${featureIndex}: Polygon is a closed triangle (acceptable)`
    );
    return;
  }
  if (ring.length <= 4) {
    addStep(
      results,
      `Feature ${featureIndex} straight lines`,
      false,
      `Feature ${featureIndex}: Polygon may have excessive straight lines (not enough points for curves)`
    );
    addError(
      results,
      `Feature ${featureIndex}: Polygon may have excessive straight lines (not enough points for curves)`
    );
  } else {
    addStep(
      results,
      `Feature ${featureIndex} straight lines`,
      true,
      `Feature ${featureIndex}: Polygon has enough points for curves`
    );
  }
}

// Add new function to validate Point coordinates
function validatePointCoordinatesWithSteps(
  coordinates: any[],
  featureIndex: number,
  results: ValidationResultWithSteps
) {
  // For Point type, coordinates should be a single array of [longitude, latitude]
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    addStep(
      results,
      `Feature ${featureIndex} point coordinates`,
      false,
      `Feature ${featureIndex}: Point coordinates must be an array of [longitude, latitude]`
    );
    addError(
      results,
      `Feature ${featureIndex}: Point coordinates must be an array of [longitude, latitude]`
    );
    return;
  }

  // Validate each coordinate value
  coordinates.forEach((coord, idx) => {
    if (typeof coord !== "number") {
      addStep(
        results,
        `Feature ${featureIndex} point coordinate ${idx}`,
        false,
        `Feature ${featureIndex}: Point coordinate ${idx} must be a number`
      );
      addError(
        results,
        `Feature ${featureIndex}: Point coordinate ${idx} must be a number`
      );
    }
  });

  const [lon, lat] = coordinates;
  
  // Rule 9: Longitude must be between -180 and 180
  if (typeof lon !== "number" || lon < -180 || lon > 180) {
    addStep(
      results,
      `Feature ${featureIndex} point longitude`,
      false,
      `Feature ${featureIndex}: Invalid longitude ${lon} - must be between -180 and 180`
    );
    addError(
      results,
      `Feature ${featureIndex}: Invalid longitude ${lon} - must be between -180 and 180`
    );
  } else {
    addStep(
      results,
      `Feature ${featureIndex} point longitude`,
      true,
      `Feature ${featureIndex}: Longitude ${lon} is valid`
    );
  }
  
  // Rule 10: Latitude must be between -90 and 90
  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    addStep(
      results,
      `Feature ${featureIndex} point latitude`,
      false,
      `Feature ${featureIndex}: Invalid latitude ${lat} - must be between -90 and 90`
    );
    addError(
      results,
      `Feature ${featureIndex}: Invalid latitude ${lat} - must be between -90 and 90`
    );
  } else {
    addStep(
      results,
      `Feature ${featureIndex} point latitude`,
      true,
      `Feature ${featureIndex}: Latitude ${lat} is valid`
    );
  }

  addStep(
    results,
    `Feature ${featureIndex} point coordinates`,
    true,
    `Feature ${featureIndex}: Point coordinates are valid`
  );
}

// Helper functions
function addError(results: ValidationResultWithSteps, message: string) {
  results.isValid = false;
  results.errors.push(message);
}

function addStep(
  results: ValidationResultWithSteps,
  rule: string,
  passed: boolean,
  message: string
) {
  results.steps.push({ rule, passed, message });
}

function pointsEqual(p1: any[], p2: any[]) {
  const r1 = roundCoord(p1);
  const r2 = roundCoord(p2);
  return r1.length === r2.length && r1.every((val, i) => val === r2[i]);
}

function roundCoord(coord: any[]): any[] {
  return coord.map((val) =>
    typeof val === "number" ? Math.round(val * 1e6) / 1e6 : val
  );
}

function calculateAngle(p1: number[], p2: number[], p3: number[]) {
  const v1 = [p1[0] - p2[0], p1[1] - p2[1]];
  const v2 = [p3[0] - p2[0], p3[1] - p2[1]];
  const dotProduct = v1[0] * v2[0] + v1[1] * v2[1];
  const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
  const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
  if (mag1 === 0 || mag2 === 0) return 180;
  const cosTheta = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
  return Math.acos(cosTheta) * (180 / Math.PI);
}

function segmentsIntersect(
  p1: number[],
  p2: number[],
  p3: number[],
  p4: number[]
) {
  const ccw = (a: number[], b: number[], c: number[]) => {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  };
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}
