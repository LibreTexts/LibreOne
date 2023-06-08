import { after, describe, it } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { server } from '..';
import { APIUser, APIUserPermissionConfig, Organization, Service, System, User, UserOrganization } from '../models';

describe('Permissions', async () => {
  let mainAPIUser: APIUser;
  let mainAPIUserUsername: string;
  let mainAPIUserHashedPassword: string;
  const mainAPIUserPassword = 'test-password';

  let apiUser1: APIUser;
  let user1: User;
  let libreTexts: Organization;
  let org1: Organization;
  let system1: System;
  let service1: Service;
  before(async () => {
    mainAPIUserHashedPassword = await bcrypt.hash(mainAPIUserPassword, 10);
    mainAPIUser = await APIUser.create({
      username: 'apiuser1',
      password: mainAPIUserHashedPassword,
    });
    mainAPIUserUsername = mainAPIUser.get('username');
    await APIUserPermissionConfig.create({
      api_user_id: mainAPIUser.id,
      users_read: true,
    });

    apiUser1 = await APIUser.create({
      username: 'apiuser',
      password: 'ASuperStrongPassword!123',
    });
    user1 = await User.create({
      uuid: uuidv4(),
      email: 'user1@libretexts.org',
    });
    libreTexts = await Organization.create({ name: 'LibreTexts' });
    org1 = await Organization.create({ name: 'Organization1' });
    system1 = await System.create({ name: 'System1', logo: '' });
    service1 = await Service.create({
      body: '',
      evaluation_Order: 1,
      evaluation_Priority: 1,
      name: 'Service1',
      service_Id: 'service1',
    });
  });
  after(async () => {
    await APIUser.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Organization.destroy({ where: {} });
    await System.destroy({ where: {} });
    await Service.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });

  describe('Check Permissions', () => {
    describe('User', () => {
      it('should allow user to edit themselves', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'User',
            resourceID: user1.uuid,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should not allow user to edit another User', async () => {
        const user2 = await User.create({
          uuid: uuidv4(),
          email: 'user2@libretexts.org',
        });
  
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'User',
            resourceID: user2.uuid,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });

        await user2.destroy();
      });
      it('should not allow user to create another User', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'User',
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow user to edit Organization', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'Organization',
            resourceID: org1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow user to create an Organization', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'Organization',
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow user to edit a System', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'System',
            resourceID: system1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow user to read or write API User', async () => {
        const response1 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'APIUser',
            resourceID: apiUser1.id,
            action: 'READ',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response1.status).to.equal(200);
        expect(response1.body?.data).to.deep.equal({ effect: 'DENY' });

        const response2 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'APIUser',
            resourceID: apiUser1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response2.status).to.equal(200);
        expect(response2.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow user to read or write Service', async () => {  
        const response1 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'Service',
            resourceID: service1.id,
            action: 'READ',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response1.status).to.equal(200);
        expect(response1.body?.data).to.deep.equal({ effect: 'DENY' });

        const response2 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: user1.uuid,
            resourceType: 'Service',
            resourceID: service1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response2.status).to.equal(200);
        expect(response2.body?.data).to.deep.equal({ effect: 'DENY' });
      });
    });

    describe('OrganizationAdministrator', () => {
      let orgAdmin: User;
      before(async () => {
        orgAdmin = await User.create({
          uuid: uuidv4(),
          email: 'orgadmin@libretexts.org',
        });
        await UserOrganization.create({
          user_id: orgAdmin.uuid,
          organization_id: org1.id,
          admin_role: 'org_admin',
        });
      });

      after(async () => {
        await orgAdmin.destroy();
      });

      it('should allow org admin to edit the Organization', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'Organization',
            resourceID: org1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should not allow org admin to edit another Organization', async () => {
        const org2 = await Organization.create({ name: 'Organization2' });

        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'Organization',
            resourceID: org2.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });

        await org2.destroy();
      });
      it('should not allow org admin to create an Organization', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'Organization',
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org admin to edit a User', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'User',
            resourceID: user1.uuid,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org admin to create a User', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'User',
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org admin to edit a System', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'System',
            resourceID: system1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org admin to read or write API User', async () => {
        const response1 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'APIUser',
            resourceID: apiUser1.id,
            action: 'READ',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response1.status).to.equal(200);
        expect(response1.body?.data).to.deep.equal({ effect: 'DENY' });

        const response2 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'APIUser',
            resourceID: apiUser1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response2.status).to.equal(200);
        expect(response2.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org admin to read or write Service', async () => {
        const response1 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'Service',
            resourceID: service1.id,
            action: 'READ',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response1.status).to.equal(200);
        expect(response1.body?.data).to.deep.equal({ effect: 'DENY' });

        const response2 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgAdmin.uuid,
            resourceType: 'Service',
            resourceID: service1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response2.status).to.equal(200);
        expect(response2.body?.data).to.deep.equal({ effect: 'DENY' });
      });
    });

    describe('OrganizationSystemAdministrator', () => {
      let orgSysAdmin: User;
      let orgWithSystem: Organization;

      before(async () => {
        orgSysAdmin = await User.create({
          uuid: uuidv4(),
          email: 'orgsysadmin@libretexts.org',
        });
        orgWithSystem = await Organization.create({
          name: 'OrganizationWithSystem',
          system_id: system1.id,
        });
        await UserOrganization.create({
          user_id: orgSysAdmin.uuid,
          organization_id: orgWithSystem.id,
          admin_role: 'org_sys_admin',
        });
      });

      after(async () => {
        await orgSysAdmin.destroy();
        await orgWithSystem.destroy();
      });

      it('should allow org system admin to edit the Organization', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'Organization',
            resourceID: orgWithSystem.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should allow org system admin to edit another Organization in the System', async () => {
        const org2 = await Organization.create({
          name: 'Organization2',
          system_id: system1.id,
        });

        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'Organization',
            resourceID: org2.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });

        await org2.destroy();
      });
      it('should allow org system admin to create an Organization', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'Organization',
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org system admin to edit Organization not in the System', async () => {
        const org2 = await Organization.create({ name: 'Organization2' });

        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'Organization',
            resourceID: org2.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });

        await org2.destroy();
      });
      it('should not allow org system admin to edit the System', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'System',
            resourceID: system1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org system admin to edit a User', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'User',
            resourceID: user1.uuid,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org system admin to create a User', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'User',
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org system admin to read or write API User', async () => {
        const response1 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'APIUser',
            resourceID: apiUser1.id,
            action: 'READ',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response1.status).to.equal(200);
        expect(response1.body?.data).to.deep.equal({ effect: 'DENY' });

        const response2 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'APIUser',
            resourceID: apiUser1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response2.status).to.equal(200);
        expect(response2.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow org system admin to read or write Service', async () => {  
        const response1 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'Service',
            resourceID: service1.id,
            action: 'READ',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response1.status).to.equal(200);
        expect(response1.body?.data).to.deep.equal({ effect: 'DENY' });

        const response2 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: orgSysAdmin.uuid,
            resourceType: 'Service',
            resourceID: service1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response2.status).to.equal(200);
        expect(response2.body?.data).to.deep.equal({ effect: 'DENY' });
      });
    });

    describe('SuperAdministrator', () => {
      let superAdmin: User;
      before(async () => {
        superAdmin = await User.create({
          uuid: uuidv4(),
          email: 'super@libretexts.org',
        });
        await UserOrganization.create({
          user_id: superAdmin.uuid,
          organization_id: libreTexts.id,
          admin_role: 'super_admin',
        });
      });
  
      after(async () => {
        await superAdmin.destroy();
      });
  
      it('should allow super admin to edit any User', async () => {  
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: superAdmin.uuid,
            resourceType: 'User',
            resourceID: user1.uuid,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should allow super admin to create a User', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: superAdmin.uuid,
            resourceType: 'User',
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should allow super admin to edit any Organization', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: superAdmin.uuid,
            resourceType: 'Organization',
            resourceID: org1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should allow super admin to create an Organization', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: superAdmin.uuid,
            resourceType: 'Organization',
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should allow super admin to edit any System', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: superAdmin.uuid,
            resourceType: 'System',
            resourceID: system1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should allow super admin to read API User', async () => {
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: superAdmin.uuid,
            resourceType: 'APIUser',
            resourceID: apiUser1.id,
            action: 'READ',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should not allow super admin to write API User', async () => {  
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: superAdmin.uuid,
            resourceType: 'APIUser',
            resourceID: apiUser1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'DENY' });
      });
      it('should not allow super admin to read or write Service', async () => {  
        const response1 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: superAdmin.uuid,
            resourceType: 'Service',
            resourceID: service1.id,
            action: 'READ',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response1.status).to.equal(200);
        expect(response1.body?.data).to.deep.equal({ effect: 'DENY' });

        const response2 = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: superAdmin.uuid,
            resourceType: 'Service',
            resourceID: service1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        expect(response2.status).to.equal(200);
        expect(response2.body?.data).to.deep.equal({ effect: 'DENY' });
      });
    });

    describe('Omnipotent', () => {
      let omnipotent: User;
      before(async () => {
        omnipotent = await User.create({
          uuid: uuidv4(),
          email: 'omnipotent@libretexts.org',
        });
        await UserOrganization.create({
          user_id: omnipotent.uuid,
          organization_id: libreTexts.id,
          admin_role: 'omnipotent',
        });
      });
      after(async () => {
        await omnipotent.destroy();
      });
  
      it('should allow omnipotent to write API User', async () => {  
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: omnipotent.uuid,
            resourceType: 'APIUser',
            resourceID: apiUser1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
      it('should allow omnipotent to write Service', async () => {  
        const response = await request(server)
          .post('/api/v1/permissions/check')
          .send({
            userUUID: omnipotent.uuid,
            resourceType: 'Service',
            resourceID: service1.id,
            action: 'WRITE',
          })
          .auth(mainAPIUserUsername, mainAPIUserPassword);
      
        expect(response.status).to.equal(200);
        expect(response.body?.data).to.deep.equal({ effect: 'ALLOW' });
      });
    });
  });
});
