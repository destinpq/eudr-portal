import 'dotenv/config';
import { AuthService } from '../services/auth.service';
import { validatePasswordPolicy } from '../utils/password';

function generatePassword(): string {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    const allChars = uppercase + lowercase + numbers + special;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to ensure randomness
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}


async function createAdminUser() {
    try {
        const authService = new AuthService();
        const adminId = 'adminitcpspd';
        
        // Check if admin user already exists
        try {
            const existingUser = await authService.getUserByCustomerId(adminId);
            if (existingUser) {
                console.log(`Admin user '${adminId}' already exists. Aborting.`);
                return;
            }
        } catch (error) {
            // User not found is expected, continue.
        }

        let password = '';
        let policyErrors: string[] = [];
        // Keep generating passwords until one meets the policy
        do {
            password = generatePassword();
            policyErrors = validatePasswordPolicy(password, true); // true for admin policy
        } while (policyErrors.length > 0)

        console.log(`Creating admin user '${adminId}'...`);

        const adminUser = await authService.createUser(
            adminId,
            password,
            'admin'
        );

        console.log('\n=================================================');
        console.log('✅ Admin user created successfully!');
        console.log('=================================================\n');
        console.log(`  Username: ${adminUser.customerId}`);
        console.log(`  Password: ${password}`);
        console.log('\nIMPORTANT: Please save this password securely.');
        console.log('You will not be able to see it again.');
        console.log('=================================================\n');

    } catch (error) {
        console.error('\n❌ Error creating admin user:');
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }
    }
}

// Run the script
createAdminUser(); 