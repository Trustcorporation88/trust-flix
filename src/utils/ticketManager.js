const path = require('path');
const { readJson, writeJson } = require('../core/atomicJsonStore');
const { logAudit } = require('./auditLogger');
const { emitIntegrationEvent } = require('../services/integrationEvents');

const ticketsPath = path.resolve(__dirname, '../../data/tickets.json');
function loadTickets() { return readJson(ticketsPath, []); }
function saveTickets(data) { return writeJson(ticketsPath, data); }
function id() { return `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function createTicket(customerPhone, subject = 'Atendimento solicitado', firstMessage = '') {
  const tickets = loadTickets();
  const existing = tickets.find((ticket) => ticket.customerPhone === customerPhone && !['resolved', 'cancelled'].includes(ticket.status));
  if (existing) {
    if (firstMessage) return addMessage(existing.id, 'customer', firstMessage);
    return existing;
  }
  const now = new Date().toISOString();
  const ticket = {
    id: id(), customerPhone, subject, status: 'new', priority: 'normal', assignedTo: '',
    createdAt: now, updatedAt: now, resolvedAt: null,
    messages: firstMessage ? [{ id: `msg_${Date.now()}`, sender: 'customer', text: firstMessage, timestamp: now }] : [],
    notes: '', tags: [],
  };
  tickets.push(ticket);
  saveTickets(tickets);
  logAudit('ticket.created', { ticketId: ticket.id, customerPhone, subject });
  emitIntegrationEvent('ticket.created', { ticketId: ticket.id, customerPhone, subject, status: ticket.status }).catch(() => {});
  return ticket;
}

function addMessage(ticketId, sender, text) {
  const tickets = loadTickets();
  const index = tickets.findIndex((ticket) => ticket.id === ticketId);
  if (index < 0) return null;
  const message = { id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, sender, text: String(text), timestamp: new Date().toISOString() };
  tickets[index].messages = [...(tickets[index].messages || []), message];
  tickets[index].updatedAt = message.timestamp;
  if (sender === 'customer' && tickets[index].status === 'waiting_customer') tickets[index].status = 'in_progress';
  saveTickets(tickets);
  return tickets[index];
}

function addCustomerMessage(customerPhone, text) {
  const ticket = loadTickets().find((item) => item.customerPhone === customerPhone && !['resolved', 'cancelled'].includes(item.status));
  return ticket ? addMessage(ticket.id, 'customer', text) : createTicket(customerPhone, 'Atendimento solicitado', text);
}

function updateTicket(ticketId, patch, actor = 'admin') {
  const tickets = loadTickets();
  const index = tickets.findIndex((ticket) => ticket.id === ticketId);
  if (index < 0) return null;
  const safePatch = { ...patch };
  delete safePatch.id;
  delete safePatch.customerPhone;
  tickets[index] = { ...tickets[index], ...safePatch, updatedAt: new Date().toISOString() };
  if (safePatch.status === 'resolved' && !tickets[index].resolvedAt) tickets[index].resolvedAt = new Date().toISOString();
  saveTickets(tickets);
  logAudit('ticket.updated', { ticketId, patch: Object.keys(safePatch) }, actor);
  return tickets[index];
}

function getTicket(ticketId) { return loadTickets().find((ticket) => ticket.id === ticketId) || null; }
function getOpenTicketByCustomer(customerPhone) { return loadTickets().find((ticket) => ticket.customerPhone === customerPhone && !['resolved', 'cancelled'].includes(ticket.status)) || null; }
function listTickets() { return loadTickets().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); }
function ticketStats() {
  const tickets = loadTickets();
  return {
    total: tickets.length,
    open: tickets.filter((t) => !['resolved', 'cancelled'].includes(t.status)).length,
    new: tickets.filter((t) => t.status === 'new').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };
}

module.exports = { createTicket, addMessage, addCustomerMessage, updateTicket, getTicket, getOpenTicketByCustomer, listTickets, ticketStats };
