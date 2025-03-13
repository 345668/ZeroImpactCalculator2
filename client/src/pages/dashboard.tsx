import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { BarChart2, Building2, Coins, Factory, FileDown, Calendar, RefreshCw, Loader2 } from "lucide-react";
import type { Submission } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

// Chart configuration
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("month"); // Default to month view

  // Enhanced query with error handling
  const { data: submissions = [], isLoading, error } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    retry: 3,
    staleTime: 30000,
  });

  // Add refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Success",
        description: "Dashboard data refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter submissions for last 30 days
  const last30DaysSubmissions = submissions.filter(submission => {
    const submissionDate = new Date(submission.submittedAt || "");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return submissionDate >= thirtyDaysAgo;
  });

  // Calculate metrics for CO2 savings
  const co2Metrics = last30DaysSubmissions.reduce((acc, submission) => {
    const co2Savings = Number(submission.co2Savings);
    return {
      totalCO2: acc.totalCO2 + co2Savings,
      count: acc.count + 1
    };
  }, { totalCO2: 0, count: 0 });

  // Calculate metrics for projects
  const projectMetrics = last30DaysSubmissions.reduce((acc, submission) => {
    const buildingSize = Number(submission.buildingSize);
    return {
      totalSize: acc.totalSize + buildingSize,
      count: acc.count + 1
    };
  }, { totalSize: 0, count: 0 });

  // Prepare data for CO2 savings graph (daily aggregation)
  const co2GraphData = last30DaysSubmissions.reduce((acc: any[], submission) => {
    const date = new Date(submission.submittedAt || "").toLocaleDateString();
    const existingDay = acc.find(day => day.date === date);

    if (existingDay) {
      existingDay.totalCO2 += Number(submission.co2Savings);
      existingDay.projectCount += 1;
    } else {
      acc.push({
        date,
        totalCO2: Number(submission.co2Savings),
        projectCount: 1,
        averageCO2: Number(submission.co2Savings)
      });
    }

    return acc;
  }, []).map(day => ({
    ...day,
    averageCO2: day.totalCO2 / day.projectCount
  }));

  // Prepare data for projects graph
  const projectGraphData = last30DaysSubmissions.reduce((acc: any[], submission) => {
    const date = new Date(submission.submittedAt || "").toLocaleDateString();
    const existingDay = acc.find(day => day.date === date);

    if (existingDay) {
      existingDay.totalSize += Number(submission.buildingSize);
      existingDay.projectCount += 1;
    } else {
      acc.push({
        date,
        totalSize: Number(submission.buildingSize),
        projectCount: 1,
        averageSize: Number(submission.buildingSize)
      });
    }

    return acc;
  }, []).map(day => ({
    ...day,
    averageSize: day.totalSize / day.projectCount
  }));

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          className="text-3xl font-bold"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Analytics Dashboard
        </motion.h1>
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 transition-all duration-200 ${
              isRefreshing ? 'bg-primary/5' : ''
            }`}
          >
            <RefreshCw className={`h-4 w-4 transition-all ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
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
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-[150px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px] mb-2" />
                <Skeleton className="h-4 w-[180px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <motion.div
          className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center text-destructive"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p>Error loading dashboard data. Please try refreshing.</p>
        </motion.div>
      ) : (
        <>
          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total CO₂ Savings (30 Days)</CardTitle>
                <Factory className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{co2Metrics.totalCO2.toFixed(2)} tons</div>
                <p className="text-xs text-muted-foreground">
                  Average: {(co2Metrics.totalCO2 / (co2Metrics.count || 1)).toFixed(2)} tons per project
                </p>
              </CardContent>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects (30 Days)</CardTitle>
                <Building2 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projectMetrics.count}</div>
                <p className="text-xs text-muted-foreground">
                  Average Size: {(projectMetrics.totalSize / (projectMetrics.count || 1)).toFixed(0)} m²
                </p>
              </CardContent>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Energy Reduction</CardTitle>
                <Coins className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalEnergyReduction.toFixed(2)} kWh</div>
                <p className="text-xs text-muted-foreground">
                  Average: {metrics.averageReduction.toFixed(1)}% per building
                </p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Buildings</CardTitle>
                <Building2 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalBuildings}</div>
                <p className="text-xs text-muted-foreground">Participating in program</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            className="grid gap-4 grid-cols-1 md:grid-cols-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <CardTitle>CO₂ Savings Trend (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[300px]" config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={co2GraphData}>
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Total CO₂
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {payload[0].value?.toFixed(2)} tons
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Average
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {payload[1].value?.toFixed(2)} tons
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="totalCO2"
                        name="Total CO₂ Savings"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="averageCO2"
                        name="Average CO₂ per Project"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <CardTitle>Project Statistics (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[300px]" config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectGraphData}>
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Projects
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {payload[0].value}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Avg. Size
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {payload[1].value?.toFixed(0)} m²
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Bar
                        yAxisId="left"
                        dataKey="projectCount"
                        name="Number of Projects"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="averageSize"
                        name="Average Building Size"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Submissions</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/api/submissions/export'}
                    className="flex items-center gap-2 hover:bg-primary/5"
                  >
                    <FileDown className="h-4 w-4" />
                    Export Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-muted/5">
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Energy Consultant</TableHead>
                        <TableHead className="font-semibold">Building Size</TableHead>
                        <TableHead className="font-semibold">Energy Reduction</TableHead>
                        <TableHead className="font-semibold">CO₂ Savings</TableHead>
                        <TableHead className="font-semibold">Carbon Credits</TableHead>
                        <TableHead className="font-semibold">Financial Value</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.slice(0, 10).map((submission) => (
                        <TableRow
                          key={submission.id}
                          className="transition-colors hover:bg-muted/5"
                        >
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
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/send-report', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({ submissionId: submission.id }),
                                    });

                                    if (!response.ok) {
                                      throw new Error('Failed to send report');
                                    }

                                    toast({
                                      title: "Success",
                                      description: "Report has been sent to your email",
                                    });
                                  } catch (error) {
                                    console.error('Error sending report:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to send report email",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="w-full justify-center"
                              >
                                <FileDown className="h-4 w-4 mr-1" />
                                Send Report
                              </Button>
                              {submission.fileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(submission.fileUrl, '_blank')}
                                  className="w-full justify-center"
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
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}