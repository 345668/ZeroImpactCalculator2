import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, LineChart, Line } from "recharts";
import { Separator } from "@/components/ui/separator";
import { BarChart2, Building2, Coins, Factory } from "lucide-react";
import type { Submission } from "@shared/schema";

export default function Dashboard() {
  // Fetch all submissions
  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    retry: false,
  });

  // Calculate metrics
  const metrics = submissions.reduce((acc: {
    totalCO2Savings: number;
    totalCarbonCredits: number;
    totalFinancialValue: number;
    totalBuildings: number;
  }, submission) => {
    return {
      totalCO2Savings: acc.totalCO2Savings + Number(submission.co2Savings),
      totalCarbonCredits: acc.totalCarbonCredits + Number(submission.carbonCredits),
      totalFinancialValue: acc.totalFinancialValue + Number(submission.financialValue),
      totalBuildings: acc.totalBuildings + 1,
    };
  }, {
    totalCO2Savings: 0,
    totalCarbonCredits: 0,
    totalFinancialValue: 0,
    totalBuildings: 0,
  });

  // Chart data
  const chartData = submissions
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .map(submission => ({
      date: new Date(submission.submittedAt).toLocaleDateString(),
      co2Savings: Number(submission.co2Savings),
      financialValue: Number(submission.financialValue),
      carbonCredits: Number(submission.carbonCredits),
    }));

  if (isLoading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CO₂ Savings</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCO2Savings.toFixed(2)} tons</div>
            <p className="text-xs text-muted-foreground">10-year projection: {(metrics.totalCO2Savings * 10).toFixed(2)} tons</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbon Credits</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCarbonCredits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">10-year projection: {(metrics.totalCarbonCredits * 10).toFixed(2)} credits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Value</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{metrics.totalFinancialValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">10-year projection: €{(metrics.totalFinancialValue * 10).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Buildings</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBuildings}</div>
            <p className="text-xs text-muted-foreground">Participating in program</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CO₂ Savings Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="co2Savings" 
                    name="CO₂ Savings (tons)"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Value Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar 
                    dataKey="financialValue" 
                    name="Financial Value (€)"
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Building Size</TableHead>
                <TableHead>Energy Reduction</TableHead>
                <TableHead>CO₂ Savings</TableHead>
                <TableHead>Carbon Credits</TableHead>
                <TableHead>Financial Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions?.slice(0, 5).map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{new Date(submission.submittedAt).toLocaleDateString()}</TableCell>
                  <TableCell>{submission.buildingSize} m²</TableCell>
                  <TableCell>
                    {(((Number(submission.currentConsumption) - Number(submission.projectedConsumption)) / Number(submission.currentConsumption)) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell>{Number(submission.co2Savings).toFixed(2)} tons</TableCell>
                  <TableCell>{Number(submission.carbonCredits).toFixed(2)}</TableCell>
                  <TableCell>€{Number(submission.financialValue).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}