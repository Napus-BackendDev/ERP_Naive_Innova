"use client";

import { useState } from "react";
import api from "@/lib/api";
import { HelpCircle, RefreshCw, Send } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function SupportPage() {
  const [form, setForm] = useState({ title: "", category: "other", severity: "low", description: "", contactEmail: "" });
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const loadTickets = async () => {
    setLoadingTickets(true);
    setMessage("");
    try {
      const { data } = await api.get("/support");
      setTickets(data);
    } catch (error) {
      setMessage(error.response?.data?.error || "Unable to load support requests.");
    } finally {
      setLoadingTickets(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await api.post("/support", form);
      setForm({ title: "", category: "other", severity: "low", description: "", contactEmail: "" });
      setMessage("Support request submitted.");
      await loadTickets();
    } catch (error) {
      setMessage(error.response?.data?.error || "Unable to submit the support request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-green-100 p-3 text-green-700"><HelpCircle className="h-5 w-5" /></div>
        <div><h1 className="text-xl font-bold text-slate-800">Support & Helpdesk</h1><p className="text-sm text-slate-500">Report an issue and track your submitted requests.</p></div>
      </div>
      <Card>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Input label="Issue title" value={form.title} onChange={update("title")} required className="md:col-span-2" />
          <Select label="Category" value={form.category} onChange={update("category")} options={["other", "account", "sales", "production", "inventory"]} />
          <Select label="Severity" value={form.severity} onChange={update("severity")} options={["low", "medium", "high", "critical"]} />
          <Input label="Contact email" type="email" value={form.contactEmail} onChange={update("contactEmail")} />
          <div />
          <Textarea label="Description" value={form.description} onChange={update("description")} className="md:col-span-2" />
          <div className="flex items-center justify-between gap-3 md:col-span-2"><span className={message.includes("Unable") ? "text-xs text-red-600" : "text-xs text-green-700"}>{message}</span><Button type="submit" isLoading={submitting} icon={Send}>Submit request</Button></div>
        </form>
      </Card>
      <Card>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-800">Recent requests</h2><Button variant="outline" size="sm" onClick={loadTickets} isLoading={loadingTickets} icon={RefreshCw}>Refresh</Button></div>
        {tickets.length === 0 ? <p className="text-sm text-slate-500">No requests loaded yet.</p> : <div className="space-y-3">{tickets.map((ticket) => <div key={ticket._id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-3"><span className="font-semibold text-slate-800">{ticket.title}</span><span className="text-xs capitalize text-slate-500">{ticket.severity}</span></div><p className="mt-1 text-sm text-slate-600">{ticket.description || "No description provided."}</p></div>)}</div>}
      </Card>
    </div>
  );
}
