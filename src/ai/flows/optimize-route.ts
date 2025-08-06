'use server';

/**
 * @fileOverview Optimizes routes for drivers to minimize return freight scenarios.
 *
 * - optimizeRoute - A function that suggests an optimized route for freight.
 * - OptimizeRouteInput - The input type for the optimizeRoute function.
 * - OptimizeRouteOutput - The return type for the optimizeRoute function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeRouteInputSchema = z.object({
  origin: z.string().describe('The starting location for the freight route.'),
  destination: z.string().describe('The final destination for the freight route.'),
  currentLocation: z
    .string()
    .optional()
    .describe('The current location of the driver, if available.'),
  freightType: z.string().describe('The type of freight being transported (e.g., Comum, Agregamento).'),
  vehicleType: z.string().describe('The type of vehicle being used (e.g., truck, van).'),
  avoidReturnFreight: z
    .boolean()
    .default(true)
    .describe(
      'Whether to prioritize routes that minimize the chance of needing to return without freight.'
    ),
  preferences: z
    .string()
    .optional()
    .describe('Any specific route preferences or constraints the driver has.'),
});
export type OptimizeRouteInput = z.infer<typeof OptimizeRouteInputSchema>;

const OptimizeRouteOutputSchema = z.object({
  optimizedRoute: z
    .string()
    .describe('The suggested optimized route, including waypoints and estimated travel time.'),
  returnFreightSuggestions: z
    .string()
    .optional()
    .describe('Suggestions for securing return freight along the route.'),
  efficiencyTips: z
    .string()
    .optional()
    .describe('Tips to maximize efficiency and earnings during the route.'),
});
export type OptimizeRouteOutput = z.infer<typeof OptimizeRouteOutputSchema>;

export async function optimizeRoute(input: OptimizeRouteInput): Promise<OptimizeRouteOutput> {
  return optimizeRouteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeRoutePrompt',
  input: {schema: OptimizeRouteInputSchema},
  output: {schema: OptimizeRouteOutputSchema},
  prompt: `You are an expert logistics coordinator specializing in optimizing freight routes for drivers. Given the following information, suggest an optimized route and strategies to minimize return freight scenarios.

Origin: {{{origin}}}
Destination: {{{destination}}}
Current Location: {{{currentLocation}}}
Freight Type: {{{freightType}}}
Vehicle Type: {{{vehicleType}}}
Prioritize Avoiding Return Freight: {{{avoidReturnFreight}}}
Driver Preferences: {{{preferences}}}

Consider factors such as traffic, tolls, fuel efficiency, and availability of return freight opportunities. Provide a detailed route with waypoints and estimated travel time. Also, provide suggestions for securing return freight along the route and efficiency tips for the driver.

Optimize the route to increase efficiency and earnings for the driver.
`,
});

const optimizeRouteFlow = ai.defineFlow(
  {
    name: 'optimizeRouteFlow',
    inputSchema: OptimizeRouteInputSchema,
    outputSchema: OptimizeRouteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
