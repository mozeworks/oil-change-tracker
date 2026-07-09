// Small lookup of common makes -> typical manufacturer oil-change interval (mi) and oil type.
// These are rough defaults (2015+ era gasoline engines); user can override in the form.
// Recommended interval is intentionally half the manufacturer figure for longer engine life
// (shorter intervals reduce contaminant buildup — a common independent-mechanic recommendation).
const CAR_OIL_DEFAULTS = {
  "Toyota":        { interval: 10000, oil: "Full Synthetic 0W-20" },
  "Honda":         { interval: 7500,  oil: "Full Synthetic 0W-20" },
  "Ford":          { interval: 10000, oil: "Full Synthetic 5W-30" },
  "Chevrolet":     { interval: 7500,  oil: "Full Synthetic 5W-30" },
  "GMC":           { interval: 7500,  oil: "Full Synthetic 5W-30" },
  "Nissan":        { interval: 5000,  oil: "Full Synthetic 0W-20" },
  "Hyundai":       { interval: 7500,  oil: "Full Synthetic 5W-20" },
  "Kia":           { interval: 7500,  oil: "Full Synthetic 5W-20" },
  "Subaru":        { interval: 6000,  oil: "Full Synthetic 0W-20" },
  "Mazda":         { interval: 7500,  oil: "Full Synthetic 0W-20" },
  "Volkswagen":    { interval: 10000, oil: "Full Synthetic 5W-40" },
  "BMW":           { interval: 10000, oil: "Full Synthetic 5W-30" },
  "Mercedes-Benz":  { interval: 10000, oil: "Full Synthetic 0W-20" },
  "Audi":          { interval: 10000, oil: "Full Synthetic 5W-40" },
  "Jeep":          { interval: 6000,  oil: "Full Synthetic 5W-20" },
  "Ram":           { interval: 8000,  oil: "Full Synthetic 5W-20" },
  "Dodge":         { interval: 6000,  oil: "Full Synthetic 5W-20" },
  "Tesla":         { interval: 0,     oil: "N/A — Electric (no oil)" },
  "Lexus":         { interval: 10000, oil: "Full Synthetic 0W-20" },
  "Volvo":         { interval: 10000, oil: "Full Synthetic 0W-20" },
  "Other / conventional oil": { interval: 5000, oil: "Conventional 5W-30" },
};
