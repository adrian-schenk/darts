import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from 'src/users/user.entity';
import { DartGroup } from './dartgroup.entity';

function sanitizeUser(user: User) {
  return { id: user.id, uuid: user.uuid, username: user.username };
}

@Injectable()
export class DartGroupService {
  constructor(
    @InjectRepository(DartGroup)
    private readonly groupRepository: Repository<DartGroup>,
  ) {}

  async createGroup(
    owner: User,
    name: string,
    description?: string,
  ): Promise<object> {
    const group = this.groupRepository.create({
      uuid: uuidv4(),
      name,
      description: description ?? null,
      owner,
      members: [owner],
    });
    const saved = await this.groupRepository.save(group);
    return this.sanitizeGroup(
      await this.groupRepository.findOne({
        where: { id: saved.id },
        relations: ['owner', 'members'],
      }) ?? saved,
    );
  }

  async getUserGroups(user: User): Promise<object[]> {
    const groups = await this.groupRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.owner', 'owner')
      .leftJoinAndSelect('g.members', 'members')
      .where('owner.id = :uid', { uid: user.id })
      .orWhere((qb) => {
        const sub = qb
          .subQuery()
          .select('gm.dartGroupId')
          .from('dart_group_members_user', 'gm')
          .where('gm.userId = :uid')
          .getQuery();
        return 'g.id IN ' + sub;
      })
      .setParameter('uid', user.id)
      .getMany();
    return groups.map((g) => this.sanitizeGroup(g));
  }

  async addMember(
    groupId: number,
    memberUser: User,
    requestingUser: User,
  ): Promise<object> {
    const group = await this.loadGroup(groupId);
    if (group.owner.id !== requestingUser.id) {
      throw new ForbiddenException('Only the group owner can add members');
    }
    if (group.members.some((m) => m.id === memberUser.id)) {
      throw new ForbiddenException('User is already a member');
    }

    // TODO: only allow adding friends

    group.members.push(memberUser);
    await this.groupRepository.save(group);
    return this.sanitizeGroup(group);
  }

  async removeMember(
    groupId: number,
    memberUser: User,
    requestingUser: User,
  ): Promise<void> {
    const group = await this.loadGroup(groupId);
    if (group.owner.id !== requestingUser.id) {
      throw new ForbiddenException('Only the group owner can remove members');
    }
    group.members = group.members.filter((m) => m.id !== memberUser.id);
    await this.groupRepository.save(group);
  }

  async leaveGroup(groupId: number, user: User): Promise<void> {
    const group = await this.loadGroup(groupId);
    if (group.owner.id === user.id) {
      throw new ForbiddenException(
        'Owner cannot leave — delete the group instead',
      );
    }
    group.members = group.members.filter((m) => m.id !== user.id);
    await this.groupRepository.save(group);
  }

  async deleteGroup(groupId: number, requestingUser: User): Promise<void> {
    const group = await this.loadGroup(groupId);
    if (group.owner.id !== requestingUser.id) {
      throw new ForbiddenException('Only the group owner can delete the group');
    }
    await this.groupRepository.remove(group);
  }

  private async loadGroup(id: number): Promise<DartGroup> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['owner', 'members'],
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  private sanitizeGroup(group: DartGroup) {
    return {
      id: group.id,
      uuid: group.uuid,
      name: group.name,
      description: group.description,
      owner: sanitizeUser(group.owner),
      members: group.members.map(sanitizeUser),
      createdAt: group.createdAt,
    };
  }
}
