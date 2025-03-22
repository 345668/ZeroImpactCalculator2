import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { BarChart2, Building2, Coins, Factory, FileDown, Calendar, RefreshCw, Loader2, Home, Globe } from "lucide-react";
import { Link } from "wouter";
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
import { Component, ErrorInfo, ReactNode } from "react";
import { GlobeMap } from "@/components/globe-map";
import { DashboardTable } from "@/components/dashboard-table";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-xl font-bold text-destructive">Something went wrong</h2>
          <Button
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="mt-4"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add type safety for metrics
interface Metrics {
  totalCO2Savings: number;
  totalCarbonCredits: number;
  totalFinancialValue: number;
  totalBuildings: number;
  averageReduction: number;
  totalEnergyReduction: number;
}

// Add safety functions
const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const safeDiv = (a: number, b: number, decimals = 2): number => {
  if (b === 0) return 0;
  const result = a / b;
  return Number(result.toFixed(decimals));
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number | string | undefined;
    name?: string;
    dataKey?: string;
  }>;
}

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

function SafeChart({ data, children }: { data: any[]; children: ReactNode }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return children;
}


export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("month");

  // Enhanced query with error handling and type safety
  const { data: submissions = [], isLoading, error } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    retry: 3,
    staleTime: 30000
  });

  // Update the handleRefresh function to include database sync
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First sync the database
      const syncResponse = await fetch('/api/submissions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!syncResponse.ok) {
        throw new Error('Failed to sync database');
      }

      // Then invalidate the query cache
      await queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });

      toast({
        title: "Success",
        description: "Dashboard data and database synchronized successfully",
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

  // Filter submissions for last 30 days with safety
  const last30DaysSubmissions = submissions.filter((submission: Submission) => {
    if (!submission.submittedAt) return false;
    const submissionDate = new Date(submission.submittedAt);
    if (isNaN(submissionDate.getTime())) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return submissionDate >= thirtyDaysAgo;
  });

  // Calculate metrics with safety
  const co2Metrics = last30DaysSubmissions.reduce((acc: { totalCO2: number, count: number }, submission) => {
    const co2Savings = safeNumber(submission.co2Savings);
    return {
      totalCO2: acc.totalCO2 + co2Savings,
      count: acc.count + 1
    };
  }, { totalCO2: 0, count: 0 });

  // Calculate metrics for projects with safety
  const projectMetrics = last30DaysSubmissions.reduce((acc: { totalSize: number, count: number }, submission) => {
    const buildingSize = safeNumber(submission.buildingSize);
    return {
      totalSize: acc.totalSize + buildingSize,
      count: acc.count + 1
    };
  }, { totalSize: 0, count: 0 });

  // Filter submissions based on time range with safety
  const filteredSubmissions = submissions.filter((submission: Submission) => {
    if (!submission.submittedAt) return false;
    const date = new Date(submission.submittedAt);
    if (isNaN(date.getTime())) return false;

    if (timeRange === "all") return true;
    const now = new Date();
    switch (timeRange) {
      case "week":
        return date >= new Date(now.setDate(now.getDate() - 7));
      case "month":
        return date >= new Date(now.setMonth(now.getMonth() - 1));
      case "year":
        return date >= new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return false;
    }
  });

  // Calculate metrics with safety
  const metrics: Metrics = filteredSubmissions.reduce((acc: Metrics, submission) => {
    const currentConsumption = safeNumber(submission.currentConsumption);
    const projectedConsumption = safeNumber(submission.projectedConsumption);
    const energyReduction = currentConsumption - projectedConsumption;
    const reductionPercentage = currentConsumption > 0 ? (energyReduction / currentConsumption) * 100 : 0;

    return {
      totalCO2Savings: acc.totalCO2Savings + safeNumber(submission.co2Savings),
      totalCarbonCredits: acc.totalCarbonCredits + safeNumber(submission.carbonCredits),
      totalFinancialValue: acc.totalFinancialValue + safeNumber(submission.financialValue),
      totalBuildings: acc.totalBuildings + 1,
      averageReduction: acc.averageReduction + reductionPercentage,
      totalEnergyReduction: acc.totalEnergyReduction + energyReduction,
    };
  }, {
    totalCO2Savings: 0,
    totalCarbonCredits: 0,
    totalFinancialValue: 0,
    totalBuildings: 0,
    averageReduction: 0,
    totalEnergyReduction: 0,
  });

  // Adjust average reduction safely
  metrics.averageReduction = safeDiv(metrics.averageReduction, filteredSubmissions.length);

  // Prepare chart data with safety
  const chartData = filteredSubmissions
    .filter(submission => submission.submittedAt)
    .sort((a, b) => new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime())
    .map(submission => ({
      date: submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "",
      co2Savings: safeNumber(submission.co2Savings),
      financialValue: safeNumber(submission.financialValue),
      carbonCredits: safeNumber(submission.carbonCredits),
      energyReduction: safeNumber(submission.currentConsumption) - safeNumber(submission.projectedConsumption),
    }));

  // Prepare data for CO2 savings graph (daily aggregation)
  const co2GraphData = last30DaysSubmissions.reduce((acc: any[], submission) => {
    const date = new Date(submission.submittedAt || "").toLocaleDateString();
    const existingDay = acc.find(day => day.date === date);

    const totalCO2 = safeNumber(submission.co2Savings);

    if (existingDay) {
      existingDay.totalCO2 += totalCO2;
      existingDay.projectCount += 1;
    } else {
      acc.push({
        date,
        totalCO2: totalCO2,
        projectCount: 1,
        averageCO2: totalCO2
      });
    }

    return acc;
  }, []).map(day => ({
    ...day,
    averageCO2: safeDiv(day.totalCO2, day.projectCount)
  }));

  // Prepare data for projects graph
  const projectGraphData = last30DaysSubmissions.reduce((acc: any[], submission) => {
    const date = new Date(submission.submittedAt || "").toLocaleDateString();
    const existingDay = acc.find(day => day.date === date);

    const totalSize = safeNumber(submission.buildingSize);

    if (existingDay) {
      existingDay.totalSize += totalSize;
      existingDay.projectCount += 1;
    } else {
      acc.push({
        date,
        totalSize: totalSize,
        projectCount: 1,
        averageSize: totalSize
      });
    }

    return acc;
  }, []).map(day => ({
    ...day,
    averageSize: safeDiv(day.totalSize, day.projectCount)
  }));


  return (
    <ErrorBoundary>
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
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 transition-all duration-200"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
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
                    Average: {safeDiv(co2Metrics.totalCO2, co2Metrics.count)} tons per project
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
                    Average Size: {safeDiv(projectMetrics.totalSize, projectMetrics.count, 0)} m²
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
              <Card className="transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    CO₂ Savings Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SafeChart data={co2GraphData}>
                    <ChartContainer
                      config={{
                        totalCO2: { label: "Total CO₂ Savings (tons)" },
                        averageCO2: { label: "Average CO₂ Savings (tons)" },
                        projectCount: { label: "Number of Projects" },
                        ...chartConfig
                      }}
                    >
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={co2GraphData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip
                            content={({ active, payload }: ChartTooltipProps) => {
                              if (active && payload && payload.length) {
                                return (
                                  <ChartTooltip>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center justify-between">
                                        <span>Date:</span>
                                        <span className="font-medium">{payload[0]?.payload?.date}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Total CO₂ Savings:</span>
                                        <span className="font-medium">
                                          {payload[0]?.payload?.totalCO2?.toFixed(2)} tons
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Average Per Project:</span>
                                        <span className="font-medium">
                                          {payload[0]?.payload?.averageCO2?.toFixed(2)} tons
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Projects:</span>
                                        <span className="font-medium">{payload[0]?.payload?.projectCount}</span>
                                      </div>
                                    </div>
                                  </ChartTooltip>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="totalCO2" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </SafeChart>
                </CardContent>
              </Card>

              <Card className="transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Building Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SafeChart data={projectGraphData}>
                    <ChartContainer
                      config={{
                        projectCount: { label: "Projects" },
                        totalSize: { label: "Total Size (m²)" },
                        averageSize: { label: "Average Size (m²)" },
                        ...chartConfig
                      }}
                    >
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={projectGraphData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip
                            content={({ active, payload }: ChartTooltipProps) => {
                              if (active && payload && payload.length) {
                                return (
                                  <ChartTooltip>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center justify-between">
                                        <span>Date:</span>
                                        <span className="font-medium">{payload[0]?.payload?.date}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Projects:</span>
                                        <span className="font-medium">{payload[0]?.payload?.projectCount}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Total Size:</span>
                                        <span className="font-medium">
                                          {payload[0]?.payload?.totalSize?.toFixed(0)} m²
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Average Size:</span>
                                        <span className="font-medium">
                                          {payload[0]?.payload?.averageSize?.toFixed(0)} m²
                                        </span>
                                      </div>
                                    </div>
                                  </ChartTooltip>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="projectCount"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </SafeChart>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              className="grid gap-4 grid-cols-1 md:grid-cols-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Financial Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Total Carbon Credits</p>
                        <div className="text-2xl font-bold">{metrics.totalCarbonCredits.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                          Average: {safeDiv(metrics.totalCarbonCredits, metrics.totalBuildings).toFixed(2)} per building
                        </p>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Total Financial Value</p>
                        <div className="text-2xl font-bold">€{metrics.totalFinancialValue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                          Average: €{safeDiv(metrics.totalFinancialValue, metrics.totalBuildings).toFixed(2)} per building
                        </p>
                      </div>
                    </div>

                    <SafeChart data={chartData}>
                      <ChartContainer
                        config={{
                          financialValue: { label: "Financial Value (€)" },
                          carbonCredits: { label: "Carbon Credits" },
                          ...chartConfig
                        }}
                      >
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                              content={({ active, payload }: ChartTooltipProps) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <ChartTooltip>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                          <span>Date:</span>
                                          <span className="font-medium">{payload[0]?.payload?.date}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Financial Value:</span>
                                          <span className="font-medium">
                                            €{payload[0]?.payload?.financialValue?.toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Carbon Credits:</span>
                                          <span className="font-medium">
                                            {payload[0]?.payload?.carbonCredits?.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    </ChartTooltip>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="financialValue"
                              stroke="#16a34a"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </SafeChart>
                  </div>
                </CardContent>
              </Card>

              <Card className="transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    Energy & CO₂ Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Energy Saved</p>
                        <div className="text-2xl font-bold">{metrics.totalEnergyReduction.toFixed(2)} kWh</div>
                        <p className="text-xs text-muted-foreground">
                          Average: {safeDiv(metrics.totalEnergyReduction, metrics.totalBuildings).toFixed(2)} kWh per building
                        </p>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">CO₂ Savings</p>
                        <div className="text-2xl font-bold">{metrics.totalCO2Savings.toFixed(2)} tons</div>
                        <p className="text-xs text-muted-foreground">
                          Average: {safeDiv(metrics.totalCO2Savings, metrics.totalBuildings).toFixed(2)} tons per building
                        </p>
                      </div>
                    </div>

                    <SafeChart data={chartData}>
                      <ChartContainer
                        config={{
                          co2Savings: { label: "CO₂ Savings (tons)" },
                          energyReduction: { label: "Energy Reduction (kWh)" },
                          ...chartConfig
                        }}
                      >
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                              content={({ active, payload }: ChartTooltipProps) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <ChartTooltip>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                          <span>Date:</span>
                                          <span className="font-medium">{payload[0]?.payload?.date}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>CO₂ Savings:</span>
                                          <span className="font-medium">
                                            {payload[0]?.payload?.co2Savings?.toFixed(2)} tons
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Energy Reduction:</span>
                                          <span className="font-medium">
                                            {payload[0]?.payload?.energyReduction?.toFixed(2)} kWh
                                          </span>
                                        </div>
                                      </div>
                                    </ChartTooltip>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="co2Savings" fill="#16a34a" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </SafeChart>
                  </div>
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
                  {/* Two-column layout for Globe Map and Table */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <GlobeMap submissions={filteredSubmissions} isLoading={isLoading} />
                    </div>
                    <div className="lg:col-span-2">
                      <DashboardTable submissions={filteredSubmissions} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}