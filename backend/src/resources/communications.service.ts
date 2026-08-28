import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../data/prisma.service';

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string) {
    this.requireUserId(userId);
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return {
      unreadCount: items.filter((item) => !item.readAt).length,
      items: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null })),
    };
  }

  async markNotificationsRead(userId: string, notificationIds?: string[]) {
    this.requireUserId(userId);
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...(notificationIds?.length ? { id: { in: notificationIds } } : {}) },
      data: { readAt: new Date() },
    });
    return this.getNotifications(userId);
  }

  async getConversation(residentId: string, professionalId: string) {
    this.requireUserId(residentId);
    const professional = await this.prisma.professional.findUnique({ where: { id: professionalId }, select: { id: true, name: true, userId: true } });
    if (!professional) throw new NotFoundException('Prestador não encontrado.');
    await this.ensureResident(residentId);
    const conversation = await this.prisma.conversation.upsert({
      where: { residentId_professionalId: { residentId, professionalId } },
      create: { residentId, professionalId },
      update: {},
      include: { messages: { include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    await this.prisma.directMessage.updateMany({
      where: { conversationId: conversation.id, senderId: { not: residentId }, readAt: null },
      data: { readAt: new Date() },
    });
    return this.serializeConversation(conversation, professional);
  }

  async sendMessage(residentId: string, professionalId: string, content: string) {
    this.requireUserId(residentId);
    const text = content?.trim();
    if (!text) throw new BadRequestException('Escreva uma mensagem antes de enviar.');
    if (text.length > 1200) throw new BadRequestException('A mensagem pode ter no máximo 1.200 caracteres.');

    const professional = await this.prisma.professional.findUnique({ where: { id: professionalId }, select: { id: true, name: true, userId: true } });
    if (!professional) throw new NotFoundException('Prestador não encontrado.');
    const resident = await this.ensureResident(residentId);
    const conversation = await this.prisma.conversation.upsert({
      where: { residentId_professionalId: { residentId, professionalId } },
      create: { residentId, professionalId },
      update: {},
    });
    await this.prisma.directMessage.create({ data: { conversationId: conversation.id, senderId: residentId, content: text } });
    await this.prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

    if (professional.userId) {
      await this.prisma.notification.create({
        data: {
          userId: professional.userId,
          type: 'MESSAGE',
          title: `Nova mensagem de ${resident.name}`,
          body: text.length > 120 ? `${text.slice(0, 117)}...` : text,
        },
      });
    }
    return this.getConversation(residentId, professionalId);
  }

  private async ensureResident(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  private requireUserId(userId: string) {
    if (!userId?.trim()) throw new BadRequestException('Usuário não informado.');
  }

  private serializeConversation(
    conversation: { id: string; messages: Array<{ id: string; content: string; createdAt: Date; readAt: Date | null; sender: { id: string; name: string } }> },
    professional: { id: string; name: string },
  ) {
    return {
      id: conversation.id,
      professional,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        readAt: message.readAt?.toISOString() ?? null,
        sender: message.sender,
      })),
    };
  }
}
