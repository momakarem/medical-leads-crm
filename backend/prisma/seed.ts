import * as argon2 from 'argon2';
import { ActivityType, FollowUpStatus, LeadStatus, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const users = [
  { name: 'QA Admin', email: 'admin@example.com', password: 'Admin123!', role: UserRole.admin },
  { name: 'QA Manager One', email: 'manager@example.com', password: 'Manager123!', role: UserRole.manager },
  { name: 'QA Manager Two', email: 'manager2@example.com', password: 'Manager123!', role: UserRole.manager },
  { name: 'QA Agent One', email: 'agent@example.com', password: 'Agent123!', role: UserRole.agent },
  { name: 'QA Agent Two', email: 'agent2@example.com', password: 'Agent123!', role: UserRole.agent },
  { name: 'QA Agent Three', email: 'agent3@example.com', password: 'Agent123!', role: UserRole.agent },
  { name: 'QA Agent Four', email: 'agent4@example.com', password: 'Agent123!', role: UserRole.agent },
  { name: 'QA Agent Five', email: 'agent5@example.com', password: 'Agent123!', role: UserRole.agent },
  { name: 'QA Marketing Viewer', email: 'marketing@example.com', password: 'Marketing123!', role: UserRole.marketing },
];

const treatmentNames = ['Dental', 'Dermatology', 'Hair Transplant', 'Plastic Surgery', 'Orthodontics'];
const sourceChannels = ['Meta', 'TikTok', 'Snapchat', 'Google', 'WhatsApp', 'Direct Call', 'Referral'];
const statuses = [
  LeadStatus.new,
  LeadStatus.no_answer,
  LeadStatus.follow_up,
  LeadStatus.interested,
  LeadStatus.not_interested,
  LeadStatus.wrong_number,
  LeadStatus.job_seeker,
  LeadStatus.booked,
  LeadStatus.showed_up,
  LeadStatus.no_show,
  LeadStatus.paid,
];
const leadNames = [
  'Mohammed Ahmed', 'Sara Hassan', 'Omar Khaled', 'Mona Ali', 'Youssef Adel',
  'Nour Mostafa', 'Khaled Nabil', 'Laila Fathy', 'Hany Salah', 'Reem Tarek',
  'Ahmed Samir', 'Farah Mahmoud', 'Karim Yasser', 'Dina Sherif', 'Mostafa Amin',
  'Salma Gamal', 'Amr Fouad', 'Nada Hossam', 'Tamer Saeed', 'Habiba Adel',
  'Mahmoud Nader', 'Mariam Ashraf', 'Seif Magdy', 'Yara Essam', 'Heba Hassan',
  'Ali Reda', 'Rana Ehab', 'Fady Kamal', 'Aya Mohamed', 'Bassel Omar',
  'Malak Ibrahim', 'Ziad Ayman', 'Ghada Samy', 'Hussein Walid', 'Jana Kareem',
  'Eslam Taha', 'Mai Emad', 'Sherif Nasser', 'Noha Magdy', 'Adam Wael',
  'Hala Farouk', 'Yassin Osama', 'Rania Fouad', 'Tarek Hesham', 'Lina Sameh',
  'Basma Atef', 'Marwan Ashraf', 'Menna Alaa', 'Amina Galal', 'Fares Hatem',
];

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('QA seed data cannot be seeded in production.');

  await prisma.activity.deleteMany();
  await prisma.leadStatusHistory.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.treatment.deleteMany();

  for (const user of users) {
    const password = await argon2.hash(user.password, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, password },
      update: { name: user.name, password, role: user.role, isActive: true },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
  const agents = await prisma.user.findMany({ where: { role: UserRole.agent }, orderBy: { email: 'asc' } });

  const treatments = [];
  for (const name of treatmentNames) {
    treatments.push(await prisma.treatment.create({ data: { name, description: `${name} QA treatment` } }));
  }

  const now = new Date();
  const leads = [];
  for (let index = 0; index < 50; index += 1) {
    const status = statuses[index % statuses.length];
    const agent = agents[index % agents.length];
    const createdAt = addDays(now, -index);
    const lead = await prisma.lead.create({
      data: {
        name: leadNames[index],
        phone: `+97150${String(1000000 + index).padStart(7, '0')}`,
        sourceChannel: sourceChannels[index % sourceChannels.length],
        campaignName: `${sourceChannels[index % sourceChannels.length]} QA Campaign ${Math.floor(index / 10) + 1}`,
        treatmentId: treatments[index % treatments.length].id,
        status,
        ownerAgentId: agent.id,
        createdBy: admin.id,
        createdAt,
      },
    });
    leads.push(lead);

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: admin.id,
        type: ActivityType.lead_created,
        title: 'Lead Created',
        description: `${admin.name} created this lead.`,
        metadata: { status },
        createdAt,
      },
    });

    if (index % 3 === 0) {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: agent.id,
          type: ActivityType.lead_updated,
          title: 'Lead Updated',
          description: `${agent.name} updated lead information.`,
          metadata: { changed_fields: ['phone', 'treatmentId'] },
          createdAt: addHours(createdAt, 1),
        },
      });
    }

    if (status !== LeadStatus.new) {
      await prisma.leadStatusHistory.create({
        data: { leadId: lead.id, oldStatus: LeadStatus.new, newStatus: status, changedBy: agent.id, createdAt: addHours(createdAt, 2) },
      });
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: agent.id,
          type: ActivityType.status_changed,
          title: 'Status Changed',
          description: `${agent.name} changed status from New to ${statusLabel(status)}.`,
          metadata: { old_status: LeadStatus.new, new_status: status },
          createdAt: addHours(createdAt, 2),
        },
      });
    }
  }

  for (let index = 0; index < 15; index += 1) {
    const lead = leads[index];
    const agent = agents[index % agents.length];
    const status = index < 5 ? FollowUpStatus.completed : FollowUpStatus.pending;
    const scheduledAt = index < 5 ? addDays(now, -index - 1) : index < 10 ? addHours(now, -index - 1) : addDays(now, index - 8);
    const completedAt = status === FollowUpStatus.completed ? addHours(scheduledAt, 1) : null;
    const scheduledDate = new Date(Date.UTC(scheduledAt.getUTCFullYear(), scheduledAt.getUTCMonth(), scheduledAt.getUTCDate()));
    const scheduledTime = `${String(scheduledAt.getHours()).padStart(2, '0')}:${String(scheduledAt.getMinutes()).padStart(2, '0')}`;

    const followUp = await prisma.followUp.create({
      data: {
        leadId: lead.id,
        userId: agent.id,
        scheduledDate,
        scheduledTime,
        scheduledAt,
        status,
        completedAt,
        note: index % 2 === 0 ? 'Patient asked to call after work.' : null,
      },
    });

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: agent.id,
        type: ActivityType.follow_up_created,
        title: 'Follow-Up Created',
        description: `${agent.name} scheduled a follow-up for ${scheduledAt.toISOString()}.`,
        metadata: { follow_up_id: followUp.id, scheduled_at: scheduledAt.toISOString(), status },
      },
    });

    if (status === FollowUpStatus.completed) {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: agent.id,
          type: ActivityType.follow_up_completed,
          title: 'Follow-Up Completed',
          description: `${agent.name} completed this follow-up.`,
          metadata: { follow_up_id: followUp.id, completed_at: completedAt?.toISOString(), status },
        },
      });
    }
  }
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addHours(date: Date, hours: number): Date {
  const copy = new Date(date);
  copy.setHours(copy.getHours() + hours);
  return copy;
}

function statusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    new: 'New',
    no_answer: 'No Answer',
    follow_up: 'Follow Up',
    interested: 'Interested',
    not_interested: 'Not Interested',
    wrong_number: 'Wrong Number',
    job_seeker: 'Job Seeker',
    booked: 'Booked',
    showed_up: 'Showed Up',
    no_show: 'No Show',
    paid: 'Paid',
  };
  return labels[status];
}

seed()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });

