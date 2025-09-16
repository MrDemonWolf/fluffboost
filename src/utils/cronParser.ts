import cronstrue from "cronstrue";

/**
 * Converts a cron expression to a human-readable description
 * @param cronExpression - The cron expression to parse (e.g., "0 8 * * *")
 * @param options - Optional configuration for the parser
 * @returns A human-readable description of the cron expression
 */
export const cronToText = (
  cronExpression: string,
  options?: {
    throwExceptionOnParseError?: boolean;
    casingType?: "sentence" | "title" | "lower";
    use24HourTimeFormat?: boolean;
    locale?: string;
  }
): string => {
  try {
    return cronstrue.toString(cronExpression, {
      throwExceptionOnParseError: false,
      casingType: "sentence",
      use24HourTimeFormat: true,
      ...options,
    });
  } catch {
    // Fallback to returning the original expression if parsing fails
    return `Invalid cron expression: ${cronExpression}`;
  }
};

/**
 * Validates if a cron expression is valid
 * @param cronExpression - The cron expression to validate
 * @returns True if the expression is valid, false otherwise
 */
export const isValidCron = (cronExpression: string): boolean => {
  try {
    cronstrue.toString(cronExpression, {
      throwExceptionOnParseError: true,
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets a detailed breakdown of a cron expression
 * @param cronExpression - The cron expression to analyze
 * @returns An object with both the original expression and human-readable description
 */
export const getCronDetails = (cronExpression: string) => {
  const isValid = isValidCron(cronExpression);

  return {
    expression: cronExpression,
    description: isValid
      ? cronToText(cronExpression)
      : "Invalid cron expression",
    isValid,
  };
};

export default {
  cronToText,
  isValidCron,
  getCronDetails,
};
