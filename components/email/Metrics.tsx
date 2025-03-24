"use client";

import { useMemo } from "react";
import { Email } from "../../types/email";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface MetricsProps {
  emails: Email[];
}

// Chart colors
const COLORS = [
  "#4f46e5", // Indigo
  "#3b82f6", // Blue
  "#0ea5e9", // Light Blue
  "#0d9488", // Teal
  "#84cc16", // Lime
  "#ca8a04", // Yellow
  "#ea580c", // Orange
  "#dc2626", // Red
  "#d946ef", // Fuchsia
  "#8b5cf6", // Violet
];

export function Metrics({ emails }: MetricsProps) {
  // Basic metrics
  const totalEmails = emails.length;
  const unreadEmails = emails.filter((email) => !email.isRead).length;
  const starredEmails = emails.filter((email) => email.isStarred).length;
  const archivedEmails = emails.filter((email) => email.isArchived).length;
  const emailsWithAttachments = emails.filter(
    (email) => email.hasAttachments
  ).length;
  const trackedEmails = emails.filter((email) => email.isTracked).length;

  // Email metrics by domain
  const domainMetrics = useMemo(() => {
    const domains = new Map<string, number>();

    emails.forEach((email) => {
      const domain = email.fromEmail.split("@")[1];
      if (domain) {
        domains.set(domain, (domains.get(domain) || 0) + 1);
      }
    });

    // Convert to array and sort by count (descending)
    return Array.from(domains.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Take top 10
  }, [emails]);

  // Email metrics by time of day
  const emailsByHour = useMemo(() => {
    const hours = Array(24)
      .fill(0)
      .map((_, i) => ({
        hour: i,
        count: 0,
        label: `${i}:00`,
      }));

    emails.forEach((email) => {
      const hour = new Date(email.date).getHours();
      hours[hour].count++;
    });

    return hours;
  }, [emails]);

  // Email metrics by day of week
  const emailsByDay = useMemo(() => {
    const days = [
      { name: "Sunday", count: 0 },
      { name: "Monday", count: 0 },
      { name: "Tuesday", count: 0 },
      { name: "Wednesday", count: 0 },
      { name: "Thursday", count: 0 },
      { name: "Friday", count: 0 },
      { name: "Saturday", count: 0 },
    ];

    emails.forEach((email) => {
      const day = new Date(email.date).getDay();
      days[day].count++;
    });

    return days;
  }, [emails]);

  // Email metrics by month
  const emailsByMonth = useMemo(() => {
    const months = [
      { name: "Jan", count: 0 },
      { name: "Feb", count: 0 },
      { name: "Mar", count: 0 },
      { name: "Apr", count: 0 },
      { name: "May", count: 0 },
      { name: "Jun", count: 0 },
      { name: "Jul", count: 0 },
      { name: "Aug", count: 0 },
      { name: "Sep", count: 0 },
      { name: "Oct", count: 0 },
      { name: "Nov", count: 0 },
      { name: "Dec", count: 0 },
    ];

    emails.forEach((email) => {
      const month = new Date(email.date).getMonth();
      months[month].count++;
    });

    return months;
  }, [emails]);

  // Top senders
  const topSenders = useMemo(() => {
    const senders = new Map<string, number>();

    emails.forEach((email) => {
      const sender = email.fromName;
      senders.set(sender, (senders.get(sender) || 0) + 1);
    });

    // Convert to array and sort by count (descending)
    return Array.from(senders.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Take top 10
  }, [emails]);

  return (
    <div className="p-8 bg-white">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Email Metrics{" "}
        <span className="text-sm font-normal text-gray-500">
          ({totalEmails} emails analyzed)
        </span>
      </h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm text-gray-500 mb-1">Total Emails</h3>
          <p className="text-2xl font-bold text-gray-900">{totalEmails}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm text-gray-500 mb-1">Unread</h3>
          <p className="text-2xl font-bold text-gray-900">{unreadEmails}</p>
          <p className="text-xs text-gray-500">
            {Math.round((unreadEmails / totalEmails) * 100)}% of total
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm text-gray-500 mb-1">Starred</h3>
          <p className="text-2xl font-bold text-gray-900">{starredEmails}</p>
          <p className="text-xs text-gray-500">
            {Math.round((starredEmails / totalEmails) * 100)}% of total
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm text-gray-500 mb-1">Archived</h3>
          <p className="text-2xl font-bold text-gray-900">{archivedEmails}</p>
          <p className="text-xs text-gray-500">
            {Math.round((archivedEmails / totalEmails) * 100)}% of total
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm text-gray-500 mb-1">With Attachments</h3>
          <p className="text-2xl font-bold text-gray-900">
            {emailsWithAttachments}
          </p>
          <p className="text-xs text-gray-500">
            {Math.round((emailsWithAttachments / totalEmails) * 100)}% of total
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm text-gray-500 mb-1">Tracked</h3>
          <p className="text-2xl font-bold text-gray-900">{trackedEmails}</p>
          <p className="text-xs text-gray-500">
            {Math.round((trackedEmails / totalEmails) * 100)}% of total
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Senders */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Top Senders
          </h3>
          {topSenders.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topSenders}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" name="Emails" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-10">
              No sender data available
            </p>
          )}
        </div>

        {/* Top Domains */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Email Domains
          </h3>
          {domainMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={domainMetrics}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {domainMetrics.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-10">
              No domain data available
            </p>
          )}
        </div>

        {/* Email by Hour */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Emails by Hour of Day
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emailsByHour}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Emails" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Email by Day of Week */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Emails by Day of Week
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emailsByDay}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" name="Emails" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Email by Month */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Emails by Month
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emailsByMonth}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0d9488" name="Emails" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* No data message */}
      {totalEmails === 0 && (
        <div className="text-center text-gray-500 py-10">
          <p>No email data available for analysis.</p>
          <p className="text-sm mt-2">
            Try changing your filter or refreshing your inbox.
          </p>
        </div>
      )}
    </div>
  );
}
