import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  validateGeoJSONWithSteps,
  ValidationResultWithSteps,
  validateAllPlotsWithSteps,
  PerPlotValidationResult,
} from "../utils/geojsonValidatorWithSteps";
import ReactSelect from "react-select";

interface PlotProperties {
  [key: string]: any;
}

interface GeoJSONFeature {
  type: "Feature";
  properties: PlotProperties;
  geometry: {
    type: "Polygon" | "Point";
    coordinates: number[][][] | number[];
  };
}

interface GeoJSONData {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

interface GeoJSONPreviewProps {
  geojsonData: GeoJSONData;
  onValidate: (selectedPlots: GeoJSONFeature[]) => void;
  onClose: () => void;
  onReset: () => void;
  onGeoJsonReplace?: (file: File, geojson: any) => void;
  fileName?: string;
}

// Replace the COUNTRY_LIST with the full list provided by the user
const COUNTRY_LIST = [
  { code: "AF", name: "Afghanistan" },
  { code: "AX", name: "Aland Islands" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AS", name: "American Samoa" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AI", name: "Anguilla" },
  { code: "AQ", name: "Antarctica" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AW", name: "Aruba" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BM", name: "Bermuda" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BQ", name: "Bonaire" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BV", name: "Bouvet Island" },
  { code: "BR", name: "Brazil" },
  { code: "IO", name: "British Indian Ocean Territory" },
  { code: "BN", name: "Brunei Darussalam" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CV", name: "Cape Verde" },
  { code: "KY", name: "Cayman Islands" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CX", name: "Christmas Island" },
  { code: "CC", name: "Cocos (Keeling) Islands" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo, the Democratic Republic of the" },
  { code: "CK", name: "Cook Islands" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Cote D'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CW", name: "Curaçao" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" },
  { code: "FK", name: "Falkland Islands (Malvinas)" },
  { code: "FO", name: "Faroe Islands" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GF", name: "French Guiana" },
  { code: "PF", name: "French Polynesia" },
  { code: "TF", name: "French Southern Territories" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GI", name: "Gibraltar" },
  { code: "GR", name: "Greece" },
  { code: "GL", name: "Greenland" },
  { code: "GD", name: "Grenada" },
  { code: "GP", name: "Guadeloupe" },
  { code: "GU", name: "Guam" },
  { code: "GT", name: "Guatemala" },
  { code: "GG", name: "Guernsey" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HM", name: "Heard Island and McDonald Islands" },
  { code: "VA", name: "Holy See (Vatican City State)" },
  { code: "HN", name: "Honduras" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran, Islamic Republic of" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IM", name: "Isle of Man" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JE", name: "Jersey" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KP", name: "Korea, Democratic People's Republic of" },
  { code: "KR", name: "Korea, Republic of" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Lao People's Democratic Republic" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macao" },
  { code: "MK", name: "Macedonia, the Former Yugoslav Republic of" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MQ", name: "Martinique" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "YT", name: "Mayotte" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia, Federated States of" },
  { code: "MD", name: "Moldova, Republic of" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MS", name: "Montserrat" },
  { code: "MA", name: "Morocco" },
  // ... (add the rest as needed)
];
const COUNTRY_OPTIONS = COUNTRY_LIST.map((c) => ({
  value: c.code,
  label: `${c.name} (${c.code})`,
}));

export function GeoJSONPreview({
  geojsonData,
  onValidate,
  onClose,
  onReset,
  onGeoJsonReplace,
  fileName,
}: GeoJSONPreviewProps & {
  onGeoJsonReplace?: (file: File, geojson: any) => void;
  fileName?: string;
}) {
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [validatedPlots, setValidatedPlots] = useState<string[]>([]);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [perPlotResults, setPerPlotResults] = useState<
    PerPlotValidationResult[] | null
  >(null);
  const [isValidating, setIsValidating] = useState(false);
  const [editablePlots, setEditablePlots] = useState(
    geojsonData.features.map((feature) => ({
      ...feature,
      properties: { ...feature.properties },
    }))
  );
  const [originalPlots, setOriginalPlots] = useState(
    JSON.stringify(
      geojsonData.features.map((feature) => ({
        ...feature,
        properties: { ...feature.properties },
      }))
    )
  );
  const hasChanges = JSON.stringify(editablePlots) !== originalPlots;

  React.useEffect(() => {
    setEditablePlots(
      geojsonData.features.map((feature) => ({
        ...feature,
        properties: { ...feature.properties },
      }))
    );
    setOriginalPlots(
      JSON.stringify(
        geojsonData.features.map((feature) => ({
          ...feature,
          properties: { ...feature.properties },
        }))
      )
    );
  }, [geojsonData]);

  const handlePlotFieldChange = (idx: number, field: string, value: any) => {
    setEditablePlots((prev) => {
      const updated = [...prev];
      const currentPlot = updated[idx];

      // Convert Area to number if it's the Area field
      if (field === "Area") {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          value = numValue; // Convert to actual number
        }
      }

      updated[idx] = {
        ...updated[idx],
        properties: {
          ...updated[idx].properties,
          [field]:
            field === "ProducerCountry" && value
              ? typeof value === "object" && value.value
                ? value.value
                : value
              : value,
        },
      };
      return updated;
    });
  };

  const handleValidateAllPlots = async () => {
    setIsValidating(true);
    setTimeout(() => {
      const results = validateAllPlotsWithSteps({
        ...geojsonData,
        features: editablePlots,
      });
      setPerPlotResults(results);
      const allValid = results.every((plot) => plot.isValid);
      if (allValid) {
        const validPlotIds = results.map((plot) => plot.plotId);
        setValidatedPlots(validPlotIds);
      }
      setValidationModalOpen(true);
      setIsValidating(false);
    }, 600);
  };

  const handleProceed = () => {
    if (hasChanges) {
      // Save changes first
      const newGeoJson = {
        ...geojsonData,
        features: editablePlots,
      };
      const blob = new Blob([JSON.stringify(newGeoJson, null, 2)], {
        type: "application/geo+json",
      });
      const file = new File([blob], "edited.geojson", {
        type: "application/geo+json",
      });
      if (onGeoJsonReplace) {
        onGeoJsonReplace(file, newGeoJson);
      }
      setOriginalPlots(JSON.stringify(editablePlots));
    }
    // Proceed as before
    const validatedFeatures = editablePlots.filter((feature) =>
      validatedPlots.includes(feature.properties.plot_ID)
    );
    onValidate(validatedFeatures);
    onClose();
  };

  const isPlotValidated = (plotId: string) => validatedPlots.includes(plotId);

  const getCommonIssues = (results: PerPlotValidationResult[]): string => {
    const errorCounts: { [key: string]: number } = {};
    results.forEach((plot) => {
      plot.errors.forEach((error) => {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });
    });

    const sortedErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([error]) => error);

    return sortedErrors.join(", ") || "No common issues found";
  };

  if (validationModalOpen && perPlotResults) {
    const hasInvalidPlots = perPlotResults.some((plot) => !plot.isValid);
    const validCount = perPlotResults.filter((p) => p.isValid).length;
    const totalCount = perPlotResults.length;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {hasInvalidPlots ? "Validation Failed" : "Validation Complete"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {validCount} of {totalCount} plots valid
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-gray-200 relative overflow-hidden">
                <div
                  className="absolute inset-0 bg-green-500"
                  style={{
                    clipPath: `inset(${
                      100 - (validCount / totalCount) * 100
                    }% 0 0 0)`,
                  }}
                />
              </div>
            </div>
          </div>

          {hasInvalidPlots && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-700 font-semibold mb-2">
                Validation Failed
              </h3>
              <p className="text-red-600">
                Some plots failed validation. Please fix the issues or re-upload
                the file.
              </p>
            </div>
          )}

          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {perPlotResults.map((plot) => (
              <div
                key={plot.plotId}
                className={`rounded-lg p-4 border ${
                  plot.isValid
                    ? "border-green-300 bg-green-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span
                      className={`mr-2 text-lg ${
                        plot.isValid ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {plot.isValid ? "✅" : "❌"}
                    </span>
                    <span className="font-semibold">Plot {plot.plotId}</span>
                    {plot.farmer && (
                      <span className="ml-2 text-gray-600">
                        ({plot.farmer})
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      plot.isValid ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {plot.isValid ? "Valid" : "Invalid"}
                  </span>
                </div>
                {!plot.isValid && (
                  <ul className="list-disc ml-6 text-red-700 text-sm">
                    {plot.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t">
            <div className="space-x-2">
              {!hasInvalidPlots && (
                <Button
                  onClick={handleProceed}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Proceed
                </Button>
              )}
              {hasInvalidPlots && (
              <Button
                onClick={() => {
                  setValidationModalOpen(false);
                    onReset();
                    onClose();
                }}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Re-upload File
              </Button>
              )}
            </div>
          </div>

          {fileName && (
            <p className="text-sm text-green-600 mt-1">
              File selected: {fileName}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 h-5/6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Plot Selection Preview
          </h2>
          <div className="space-x-3">
            <Button
              onClick={() => {
                onReset();
                onClose();
              }}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              Close & Remove File
            </Button>
            <Button
              onClick={handleValidateAllPlots}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isValidating}
            >
              {isValidating ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                  Validating...
                </span>
              ) : (
                "Validate All Plots"
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 gap-6">
          <div className="bg-gray-50 rounded-lg p-6 flex flex-col">
            <div className="flex-1 overflow-y-auto max-h-[400px] border border-gray-200 rounded shadow-inner">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 text-left">Survey_ID</th>
                    <th className="p-3 text-left">Area</th>
                    <th className="p-3 text-left">ProducerCountry</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {editablePlots.map((feature, idx) => {
                    const key =
                      feature.properties.Survey_ID ??
                      feature.properties.plot_ID ??
                      Math.random();
                    return (
                      <tr
                        key={key}
                        className={`border-b hover:bg-gray-50 cursor-pointer ${
                          key === selectedPlotId ? "bg-blue-50" : ""
                        }`}
                        onClick={() => setSelectedPlotId(key)}
                      >
                        <td className="p-3">
                          <input
                            type="text"
                            className="border rounded px-2 py-1 w-full"
                            value={feature.properties.Survey_ID ?? ""}
                            onChange={(e) =>
                              handlePlotFieldChange(
                                idx,
                                "Survey_ID",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-full"
                            value={feature.properties.Area ?? ""}
                            onChange={(e) =>
                              handlePlotFieldChange(idx, "Area", e.target.value)
                            }
                          />
                        </td>
                        <td className="p-3">
                          {(() => {
                            const currentValue =
                              feature.properties.ProducerCountry;
                            const normalizedValue =
                              typeof currentValue === "string"
                                ? currentValue.trim().toUpperCase()
                                : "";
                            const matchedOption = COUNTRY_OPTIONS.find(
                              (opt) => opt.value === normalizedValue
                            );
                            const isInvalid = normalizedValue && !matchedOption;
                            return (
                              <div>
                                <ReactSelect
                                  options={COUNTRY_OPTIONS}
                                  value={matchedOption || null}
                                  onChange={(
                                    opt: { value: string; label: string } | null
                                  ) =>
                                    handlePlotFieldChange(
                                      idx,
                                      "ProducerCountry",
                                      opt ? opt.value : ""
                                    )
                                  }
                                  classNamePrefix="react-select"
                                  placeholder="Select country..."
                                  isClearable
                                  styles={
                                    isInvalid
                                      ? {
                                          control: (base) => ({
                                            ...base,
                                            borderColor: "red",
                                          }),
                                        }
                                      : {}
                                  }
                                  getOptionLabel={(option) => option.label}
                                  getOptionValue={(option) => option.value}
                                  formatOptionLabel={(option, { context }) =>
                                    context === "value"
                                      ? option.value
                                      : option.label
                                  }
                                />
                                {isInvalid && (
                                  <span className="text-xs text-red-600">
                                    Invalid country code. Please select a valid
                                    country.
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3">{feature.geometry?.type || ""}</td>
                        <td className="p-3">
                          {isPlotValidated(key) ? (
                            <span className="text-green-600">✓ Validated</span>
                          ) : (
                            <span className="text-gray-500">Not validated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
