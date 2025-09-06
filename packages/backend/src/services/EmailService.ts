import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/environment';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  private initialize(): void {
    try {
      if (config.emailHost && config.emailUser) {
        this.transporter = nodemailer.createTransport({
          host: config.emailHost,
          port: config.emailPort,
          secure: config.emailPort === 465,
          auth: {
            user: config.emailUser,
            pass: config.emailPass,
          },
        });

        // Verify connection
        this.transporter.verify((error, success) => {
          if (error) {
            console.error('Email service initialization failed:', error);
          } else {
            console.log('Email service ready');
          }
        });
      } else {
        console.log('Email service not configured - using console output');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!this.transporter) {
        // Fallback to console logging in development
        console.log('EMAIL SIMULATION:');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Body:', options.html || options.text);
        return;
      }

      const mailOptions = {
        from: options.from || config.emailFrom,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user: { email: string; name: string }): Promise<void> {
    const template = this.getWelcomeTemplate(user.name);
    await this.sendEmail({
      to: user.email,
      ...template,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: { email: string; name: string }, resetToken: string): Promise<void> {
    const template = this.getPasswordResetTemplate(user.name, resetToken);
    await this.sendEmail({
      to: user.email,
      ...template,
    });
  }

  /**
   * Send project invitation email
   */
  async sendProjectInviteEmail(
    invitee: { email: string; name: string },
    project: { name: string; id: string },
    inviter: { name: string }
  ): Promise<void> {
    const template = this.getProjectInviteTemplate(invitee.name, project, inviter.name);
    await this.sendEmail({
      to: invitee.email,
      ...template,
    });
  }

  /**
   * Send task assignment email
   */
  async sendTaskAssignmentEmail(
    assignee: { email: string; name: string },
    task: { title: string; id: string; dueDate?: Date },
    project: { name: string; id: string },
    assigner: { name: string }
  ): Promise<void> {
    const template = this.getTaskAssignmentTemplate(assignee.name, task, project, assigner.name);
    await this.sendEmail({
      to: assignee.email,
      ...template,
    });
  }

  /**
   * Send task reminder email
   */
  async sendTaskReminderEmail(
    assignee: { email: string; name: string },
    tasks: Array<{ title: string; id: string; dueDate: Date; projectName: string }>
  ): Promise<void> {
    const template = this.getTaskReminderTemplate(assignee.name, tasks);
    await this.sendEmail({
      to: assignee.email,
      ...template,
    });
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigestEmail(
    user: { email: string; name: string },
    digest: {
      tasks: Array<{ title: string; status: string }>;
      messages: number;
      notifications: number;
    }
  ): Promise<void> {
    const template = this.getDailyDigestTemplate(user.name, digest);
    await this.sendEmail({
      to: user.email,
      ...template,
    });
  }

  // Email Templates

  private getWelcomeTemplate(name: string): EmailTemplate {
    return {
      subject: 'Welcome to SynergySphere!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1976d2; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">Welcome to SynergySphere!</h1>
          </div>
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #333;">Hello ${name}! 👋</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              We're excited to have you on board! SynergySphere is your intelligent team collaboration platform
              designed to help teams work smarter and stay aligned.
            </p>
            <h3 style="color: #333;">Get Started:</h3>
            <ul style="color: #666; font-size: 16px; line-height: 1.8;">
              <li>Create your first project</li>
              <li>Invite team members</li>
              <li>Start managing tasks efficiently</li>
              <li>Communicate in real-time</li>
            </ul>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="display: inline-block; padding: 12px 30px; background-color: #1976d2; 
                        color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                Go to Dashboard
              </a>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
            <p>Need help? Contact us at support@synergyphere.com</p>
            <p>© 2024 SynergySphere. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Welcome to SynergySphere, ${name}! Get started by creating your first project and inviting team members.`,
    };
  }

  private getPasswordResetTemplate(name: string, resetToken: string): EmailTemplate {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    return {
      subject: 'Reset Your SynergySphere Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1976d2; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">Password Reset Request</h1>
          </div>
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #333;">Hello ${name},</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password. If you didn't make this request,
              you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              To reset your password, click the button below:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; padding: 12px 30px; background-color: #1976d2; 
                        color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>
          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
            <p>If you didn't request this, please ignore this email.</p>
            <p>© 2024 SynergySphere. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Hello ${name}, click this link to reset your password: ${resetUrl}. This link expires in 1 hour.`,
    };
  }

  private getProjectInviteTemplate(
    inviteeName: string,
    project: { name: string; id: string },
    inviterName: string
  ): EmailTemplate {
    const projectUrl = `${process.env.FRONTEND_URL}/projects/${project.id}`;
    return {
      subject: `You've been invited to join ${project.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1976d2; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">Project Invitation</h1>
          </div>
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #333;">Hello ${inviteeName}! 🎉</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              <strong>${inviterName}</strong> has invited you to collaborate on
              <strong>"${project.name}"</strong> in SynergySphere.
            </p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">📁 ${project.name}</h3>
              <p style="color: #666;">Join the team to start collaborating on tasks and discussions.</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${projectUrl}" 
                 style="display: inline-block; padding: 12px 30px; background-color: #1976d2; 
                        color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                View Project
              </a>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
            <p>© 2024 SynergySphere. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `${inviterName} has invited you to join "${project.name}" on SynergySphere. Visit ${projectUrl} to get started.`,
    };
  }

  private getTaskAssignmentTemplate(
    assigneeName: string,
    task: { title: string; id: string; dueDate?: Date },
    project: { name: string; id: string },
    assignerName: string
  ): EmailTemplate {
    const taskUrl = `${process.env.FRONTEND_URL}/projects/${project.id}/tasks/${task.id}`;
    const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';

    return {
      subject: `New task assigned: ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1976d2; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">New Task Assignment</h1>
          </div>
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #333;">Hello ${assigneeName},</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              <strong>${assignerName}</strong> has assigned you a new task in
              <strong>"${project.name}"</strong>.
            </p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">✅ ${task.title}</h3>
              <p style="color: #666;">
                <strong>Project:</strong> ${project.name}<br>
                <strong>Due Date:</strong> ${dueDateStr}<br>
                <strong>Assigned by:</strong> ${assignerName}
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${taskUrl}" 
                 style="display: inline-block; padding: 12px 30px; background-color: #1976d2; 
                        color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                View Task
              </a>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
            <p>© 2024 SynergySphere. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `${assignerName} has assigned you a new task: "${task.title}" in ${project.name}. Due: ${dueDateStr}`,
    };
  }

  private getTaskReminderTemplate(
    userName: string,
    tasks: Array<{ title: string; id: string; dueDate: Date; projectName: string }>
  ): EmailTemplate {
    const taskListHtml = tasks
      .map(task => {
        const daysUntilDue = Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const urgency = daysUntilDue <= 1 ? '🔴' : daysUntilDue <= 3 ? '🟡' : '🟢';
        return `
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center;">
              <span style="font-size: 20px; margin-right: 10px;">${urgency}</span>
              <div>
                <strong style="color: #333;">${task.title}</strong><br>
                <span style="color: #666; font-size: 14px;">
                  ${task.projectName} • Due: ${task.dueDate.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    return {
      subject: `Reminder: You have ${tasks.length} task${tasks.length > 1 ? 's' : ''} due soon`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ff9800; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">Task Reminder</h1>
          </div>
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #333;">Hello ${userName},</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              You have ${tasks.length} task${tasks.length > 1 ? 's' : ''} due soon:
            </p>
            ${taskListHtml}
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}/tasks" 
                 style="display: inline-block; padding: 12px 30px; background-color: #ff9800; 
                        color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                View All Tasks
              </a>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
            <p>© 2024 SynergySphere. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `You have ${tasks.length} task(s) due soon. Visit SynergySphere to view details.`,
    };
  }

  private getDailyDigestTemplate(
    userName: string,
    digest: {
      tasks: Array<{ title: string; status: string }>;
      messages: number;
      notifications: number;
    }
  ): EmailTemplate {
    const tasksSummary = digest.tasks.length > 0 
      ? digest.tasks.slice(0, 5).map(t => `• ${t.title} (${t.status})`).join('\n')
      : 'No tasks for today';

    return {
      subject: 'Your SynergySphere Daily Digest',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1976d2; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">Daily Digest</h1>
          </div>
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #333;">Good morning, ${userName}! ☀️</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Here's your activity summary for today:
            </p>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
              <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; color: #1976d2; font-weight: bold;">${digest.tasks.length}</div>
                <div style="color: #666; margin-top: 5px;">Active Tasks</div>
              </div>
              <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; color: #4caf50; font-weight: bold;">${digest.messages}</div>
                <div style="color: #666; margin-top: 5px;">New Messages</div>
              </div>
              <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; color: #ff9800; font-weight: bold;">${digest.notifications}</div>
                <div style="color: #666; margin-top: 5px;">Notifications</div>
              </div>
            </div>
            ${digest.tasks.length > 0 ? `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
                <h3 style="color: #333; margin-top: 0;">Today's Tasks:</h3>
                <pre style="color: #666; font-family: Arial, sans-serif;">${tasksSummary}</pre>
              </div>
            ` : ''}
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="display: inline-block; padding: 12px 30px; background-color: #1976d2; 
                        color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                Go to Dashboard
              </a>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
            <p>
              <a href="${process.env.FRONTEND_URL}/settings/notifications" style="color: #1976d2;">
                Manage email preferences
              </a>
            </p>
            <p>© 2024 SynergySphere. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Good morning ${userName}! You have ${digest.tasks.length} active tasks, ${digest.messages} new messages, and ${digest.notifications} notifications.`,
    };
  }
}

export default EmailService;
