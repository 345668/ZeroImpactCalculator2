import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { BarChart2, Building2, Coins, Factory, FileDown, Calendar } from "lucide-react";
import type { Submission } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Add chart configuration
const chartConfig = {
  theme: {
    background: "transparent",
    axis: {
      domain: {
        line: {
          stroke: "hsl(var(--border))",
        },
      },
    },
    grid: {
      line: {
        stroke: "hsl(var(--border))",
        strokeWidth: 1,
      },
    },
  },
};

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState("all");

  // Fetch all submissions
  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    retry: false,
  });

  // Filter submissions based on time range
  const filteredSubmissions = submissions.filter(submission => {
    if (timeRange === "all") return true;
    const date = new Date(submission.submittedAt || "");
    const now = new Date();
    switch (timeRange) {
      case "week":
        return date >= new Date(now.setDate(now.getDate() - 7));
      case "month":
        return date >= new Date(now.setMonth(now.getMonth() - 1));
      case "year":
        return date >= new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return true;
    }
  });

  // Calculate metrics
  const metrics = filteredSubmissions.reduce((acc: {
    totalCO2Savings: number;
    totalCarbonCredits: number;
    totalFinancialValue: number;
    totalBuildings: number;
    averageReduction: number;
    totalEnergyReduction: number;
  }, submission) => {
    const currentConsumption = Number(submission.currentConsumption);
    const projectedConsumption = Number(submission.projectedConsumption);
    const reduction = ((currentConsumption - projectedConsumption) / currentConsumption) * 100;

    return {
      totalCO2Savings: acc.totalCO2Savings + Number(submission.co2Savings),
      totalCarbonCredits: acc.totalCarbonCredits + Number(submission.carbonCredits),
      totalFinancialValue: acc.totalFinancialValue + Number(submission.financialValue),
      totalBuildings: acc.totalBuildings + 1,
      averageReduction: acc.averageReduction + reduction,
      totalEnergyReduction: acc.totalEnergyReduction + (currentConsumption - projectedConsumption),
    };
  }, {
    totalCO2Savings: 0,
    totalCarbonCredits: 0,
    totalFinancialValue: 0,
    totalBuildings: 0,
    averageReduction: 0,
    totalEnergyReduction: 0,
  });

  // Adjust average reduction
  metrics.averageReduction = metrics.averageReduction / (filteredSubmissions.length || 1);

  // Chart data
  const chartData = filteredSubmissions
    .sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""))
    .map(submission => ({
      date: submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "",
      co2Savings: Number(submission.co2Savings),
      financialValue: Number(submission.financialValue),
      carbonCredits: Number(submission.carbonCredits),
      energyReduction: Number(submission.currentConsumption) - Number(submission.projectedConsumption),
    }));

  if (isLoading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CO₂ Savings</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCO2Savings.toFixed(2)} tons</div>
            <p className="text-xs text-muted-foreground">
              Average: {(metrics.totalCO2Savings / (filteredSubmissions.length || 1)).toFixed(2)} tons per building
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbon Credits</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCarbonCredits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Market Impact: €{metrics.totalFinancialValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energy Reduction</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEnergyReduction.toFixed(2)} kWh</div>
            <p className="text-xs text-muted-foreground">
              Average: {metrics.averageReduction.toFixed(1)}% per building
            </p>
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
            <CardTitle>CO₂ Savings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Update ChartContainer usage */}
            <ChartContainer className="h-[300px]" config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="co2Savings"
                    name="CO₂ Savings (tons)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Energy Reduction Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Update ChartContainer usage */}
            <ChartContainer className="h-[300px]" config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="energyReduction"
                    name="Energy Reduction (kWh)"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Submissions</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/api/submissions/export'}
              className="flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Energy Consultant</TableHead>
                <TableHead>Building Size</TableHead>
                <TableHead>Energy Reduction</TableHead>
                <TableHead>CO₂ Savings</TableHead>
                <TableHead>Carbon Credits</TableHead>
                <TableHead>Financial Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.slice(0, 10).map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell>
                    {`${submission.firstName} ${submission.lastName}`}
                    <br />
                    <span className="text-xs text-muted-foreground">{submission.address}</span>
                  </TableCell>
                  <TableCell>
                    {submission.energyConsultantName ? (
                      <>
                        {submission.energyConsultantName}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {submission.energyConsultantCompany}
                          <br />
                          ID: {submission.energyConsultantId}
                          <br />
                          BAFA: {submission.energyConsultantBafaNumber}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No consultant info</span>
                    )}
                  </TableCell>
                  <TableCell>{submission.buildingSize} m²</TableCell>
                  <TableCell>
                    {(((Number(submission.currentConsumption) - Number(submission.projectedConsumption)) / Number(submission.currentConsumption)) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell>{Number(submission.co2Savings).toFixed(2)} tons</TableCell>
                  <TableCell>{Number(submission.carbonCredits).toFixed(2)}</TableCell>
                  <TableCell>€{Number(submission.financialValue).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/api/submissions/${submission.id}/report`}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        Report
                      </Button>
                      {submission.fileUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(submission.fileUrl, '_blank')}
                        >
                          <FileDown className="h-4 w-4 mr-1" />
                          View Document
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}