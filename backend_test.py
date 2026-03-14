import requests
import sys
import json
from datetime import datetime

class FoodCourtAPITester:
    def __init__(self, base_url="https://foodcourt-finance.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.manager_token = None
        self.admin_user = None
        self.manager_user = None
        self.test_restaurant_id = None
        self.test_restaurant_id_2 = None  # Second restaurant for testing
        self.test_revenue_id = None
        self.test_category_id = None
        self.test_category_id_2 = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "details": details})

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_user_registration(self):
        """Test user registration for both admin and manager"""
        print("\n🔍 Testing User Registration...")
        
        # Test admin registration
        admin_data = {
            "username": f"admin_test_{datetime.now().strftime('%H%M%S')}",
            "password": "AdminPass123!",
            "role": "admin"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', admin_data, expected_status=200)
        if success and 'token' in response:
            self.admin_token = response['token']
            self.admin_user = response
            self.log_test("Admin Registration", True)
        else:
            self.log_test("Admin Registration", False, f"Status: {status}, Response: {response}")
            return False

        # Test manager registration
        manager_data = {
            "username": f"manager_test_{datetime.now().strftime('%H%M%S')}",
            "password": "ManagerPass123!",
            "role": "manager"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', manager_data, expected_status=200)
        if success and 'token' in response:
            self.manager_token = response['token']
            self.manager_user = response
            self.log_test("Manager Registration", True)
        else:
            self.log_test("Manager Registration", False, f"Status: {status}, Response: {response}")
            return False

        return True

    def test_user_login(self):
        """Test user login functionality"""
        print("\n🔍 Testing User Login...")
        
        # Test admin login
        login_data = {
            "username": self.admin_user['username'],
            "password": "AdminPass123!"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        if success and 'token' in response:
            self.log_test("Admin Login", True)
        else:
            self.log_test("Admin Login", False, f"Status: {status}, Response: {response}")

        # Test manager login
        login_data = {
            "username": self.manager_user['username'],
            "password": "ManagerPass123!"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        if success and 'token' in response:
            self.log_test("Manager Login", True)
        else:
            self.log_test("Manager Login", False, f"Status: {status}, Response: {response}")

    def test_auth_me(self):
        """Test getting current user info"""
        print("\n🔍 Testing Auth Me Endpoint...")
        
        # Test with admin token
        success, response, status = self.make_request('GET', 'auth/me', token=self.admin_token)
        if success and response.get('role') == 'admin':
            self.log_test("Admin Auth Me", True)
        else:
            self.log_test("Admin Auth Me", False, f"Status: {status}, Response: {response}")

        # Test with manager token
        success, response, status = self.make_request('GET', 'auth/me', token=self.manager_token)
        if success and response.get('role') == 'manager':
            self.log_test("Manager Auth Me", True)
        else:
            self.log_test("Manager Auth Me", False, f"Status: {status}, Response: {response}")

    def test_restaurant_crud_admin(self):
        """Test restaurant CRUD operations as admin"""
        print("\n🔍 Testing Restaurant CRUD (Admin)...")
        
        # Test create restaurant
        restaurant_data = {
            "name": f"Test Restaurant {datetime.now().strftime('%H%M%S')}",
            "description": "A test restaurant for API testing"
        }
        
        success, response, status = self.make_request('POST', 'restaurants', restaurant_data, self.admin_token, expected_status=200)
        if success and 'id' in response:
            self.test_restaurant_id = response['id']
            self.log_test("Admin Create Restaurant", True)
        else:
            self.log_test("Admin Create Restaurant", False, f"Status: {status}, Response: {response}")
            return False

        # Test get restaurants
        success, response, status = self.make_request('GET', 'restaurants', token=self.admin_token)
        if success and isinstance(response, list):
            self.log_test("Admin Get Restaurants", True)
        else:
            self.log_test("Admin Get Restaurants", False, f"Status: {status}, Response: {response}")

        # Test update restaurant
        update_data = {
            "name": f"Updated Restaurant {datetime.now().strftime('%H%M%S')}",
            "description": "Updated description"
        }
        
        success, response, status = self.make_request('PUT', f'restaurants/{self.test_restaurant_id}', update_data, self.admin_token)
        if success:
            self.log_test("Admin Update Restaurant", True)
        else:
            self.log_test("Admin Update Restaurant", False, f"Status: {status}, Response: {response}")

        # Create a second restaurant for testing category associations
        restaurant_data_2 = {
            "name": f"Second Restaurant {datetime.now().strftime('%H%M%S')}",
            "description": "Second test restaurant for category testing"
        }
        
        success, response, status = self.make_request('POST', 'restaurants', restaurant_data_2, self.admin_token, expected_status=200)
        if success and 'id' in response:
            self.test_restaurant_id_2 = response['id']
            self.log_test("Admin Create Second Restaurant", True)
        else:
            self.log_test("Admin Create Second Restaurant", False, f"Status: {status}, Response: {response}")

        return True

    def test_restaurant_access_manager(self):
        """Test restaurant operations as manager (should be restricted)"""
        print("\n🔍 Testing Restaurant Access (Manager - Should Fail)...")
        
        # Manager should NOT be able to create restaurant
        restaurant_data = {
            "name": "Manager Test Restaurant",
            "description": "This should fail"
        }
        
        success, response, status = self.make_request('POST', 'restaurants', restaurant_data, self.manager_token, expected_status=403)
        if status == 403:
            self.log_test("Manager Create Restaurant (Forbidden)", True)
        else:
            self.log_test("Manager Create Restaurant (Forbidden)", False, f"Expected 403, got {status}")

        # Manager should be able to GET restaurants
        success, response, status = self.make_request('GET', 'restaurants', token=self.manager_token)
        if success and isinstance(response, list):
            self.log_test("Manager Get Restaurants", True)
        else:
            self.log_test("Manager Get Restaurants", False, f"Status: {status}, Response: {response}")

    def test_revenue_category_restaurant_association(self):
        """Test revenue category restaurant association functionality"""
        print("\n🔍 Testing Revenue Category Restaurant Association...")
        
        if not self.test_restaurant_id or not self.test_restaurant_id_2:
            self.log_test("Revenue Category Tests", False, "No test restaurants available")
            return False

        # Test 1: Create revenue category with restaurant_id (admin only)
        category_data = {
            "name": f"Food Sales {datetime.now().strftime('%H%M%S')}",
            "description": "Food sales category",
            "is_required": True,
            "restaurant_id": self.test_restaurant_id
        }
        
        success, response, status = self.make_request('POST', 'revenue-categories', category_data, self.admin_token, expected_status=200)
        if success and 'id' in response and response.get('restaurant_id') == self.test_restaurant_id:
            self.test_category_id = response['id']
            # Verify restaurant_name is populated
            if response.get('restaurant_name'):
                self.log_test("Admin Create Revenue Category with Restaurant", True)
            else:
                self.log_test("Admin Create Revenue Category with Restaurant", False, "restaurant_name not populated")
        else:
            self.log_test("Admin Create Revenue Category with Restaurant", False, f"Status: {status}, Response: {response}")
            return False

        # Test 2: Create second category for second restaurant
        category_data_2 = {
            "name": f"Beverage Sales {datetime.now().strftime('%H%M%S')}",
            "description": "Beverage sales category",
            "is_required": True,
            "restaurant_id": self.test_restaurant_id_2
        }
        
        success, response, status = self.make_request('POST', 'revenue-categories', category_data_2, self.admin_token, expected_status=200)
        if success and 'id' in response:
            self.test_category_id_2 = response['id']
            self.log_test("Admin Create Second Revenue Category", True)
        else:
            self.log_test("Admin Create Second Revenue Category", False, f"Status: {status}, Response: {response}")

        # Test 3: Verify restaurant_id is required
        category_data_no_restaurant = {
            "name": "Invalid Category",
            "description": "Should fail without restaurant_id",
            "is_required": True
        }
        
        success, response, status = self.make_request('POST', 'revenue-categories', category_data_no_restaurant, self.admin_token, expected_status=422)
        if status == 422:
            self.log_test("Revenue Category Requires Restaurant ID", True)
        else:
            self.log_test("Revenue Category Requires Restaurant ID", False, f"Expected 422, got {status}")

        # Test 4: Manager cannot create revenue categories
        success, response, status = self.make_request('POST', 'revenue-categories', category_data, self.manager_token, expected_status=403)
        if status == 403:
            self.log_test("Manager Cannot Create Revenue Category", True)
        else:
            self.log_test("Manager Cannot Create Revenue Category", False, f"Expected 403, got {status}")

        # Test 5: Get categories by restaurant - should only return categories for that restaurant
        success, response, status = self.make_request('GET', f'revenue-categories/restaurant/{self.test_restaurant_id}', token=self.admin_token)
        if success and isinstance(response, list):
            # Check that all returned categories belong to the correct restaurant
            all_correct_restaurant = all(cat.get('restaurant_id') == self.test_restaurant_id for cat in response)
            if all_correct_restaurant and len(response) > 0:
                self.log_test("Get Categories by Restaurant ID", True)
            else:
                self.log_test("Get Categories by Restaurant ID", False, f"Categories not filtered correctly: {response}")
        else:
            self.log_test("Get Categories by Restaurant ID", False, f"Status: {status}, Response: {response}")

        # Test 6: Get categories for second restaurant - should be different
        success, response, status = self.make_request('GET', f'revenue-categories/restaurant/{self.test_restaurant_id_2}', token=self.admin_token)
        if success and isinstance(response, list):
            all_correct_restaurant = all(cat.get('restaurant_id') == self.test_restaurant_id_2 for cat in response)
            if all_correct_restaurant:
                self.log_test("Get Categories by Second Restaurant ID", True)
            else:
                self.log_test("Get Categories by Second Restaurant ID", False, f"Categories not filtered correctly: {response}")
        else:
            self.log_test("Get Categories by Second Restaurant ID", False, f"Status: {status}, Response: {response}")

        # Test 7: Update category to different restaurant
        update_data = {
            "name": "Updated Food Sales",
            "description": "Updated description",
            "is_required": False,
            "restaurant_id": self.test_restaurant_id_2
        }
        
        success, response, status = self.make_request('PUT', f'revenue-categories/{self.test_category_id}', update_data, self.admin_token)
        if success and response.get('restaurant_id') == self.test_restaurant_id_2:
            self.log_test("Update Category Restaurant Association", True)
        else:
            self.log_test("Update Category Restaurant Association", False, f"Status: {status}, Response: {response}")

        # Test 8: Get all categories and verify restaurant associations
        success, response, status = self.make_request('GET', 'revenue-categories', token=self.admin_token)
        if success and isinstance(response, list):
            # Check that all categories have restaurant_id and restaurant_name
            all_have_restaurant_info = all(cat.get('restaurant_id') and cat.get('restaurant_name') for cat in response)
            if all_have_restaurant_info:
                self.log_test("All Categories Have Restaurant Association", True)
            else:
                self.log_test("All Categories Have Restaurant Association", False, "Some categories missing restaurant info")
        else:
            self.log_test("All Categories Have Restaurant Association", False, f"Status: {status}, Response: {response}")

        # Test 9: Try to get categories for non-existent restaurant
        success, response, status = self.make_request('GET', 'revenue-categories/restaurant/non-existent-id', token=self.admin_token, expected_status=404)
        if status == 404:
            self.log_test("Get Categories for Non-existent Restaurant", True)
        else:
            self.log_test("Get Categories for Non-existent Restaurant", False, f"Expected 404, got {status}")

        return True

    def test_revenue_operations(self):
        """Test revenue CRUD operations"""
        print("\n🔍 Testing Revenue Operations...")
        
        if not self.test_restaurant_id:
            self.log_test("Revenue Operations", False, "No test restaurant available")
            return False

        # Test create revenue entry (manager) - Updated for new amounts structure
        revenue_data = {
            "restaurant_id": self.test_restaurant_id,
            "amounts": {"Food Sales": "800.50", "Beverage Sales": "450.25"},
            "date": datetime.now().strftime('%Y-%m-%d'),
            "notes": "Test revenue entry with categorized amounts"
        }
        
        success, response, status = self.make_request('POST', 'revenues', revenue_data, self.manager_token, expected_status=200)
        if success and 'id' in response:
            self.test_revenue_id = response['id']
            self.log_test("Manager Create Revenue", True)
        else:
            self.log_test("Manager Create Revenue", False, f"Status: {status}, Response: {response}")
            return False

        # Test get revenues (manager - should see only their entries)
        success, response, status = self.make_request('GET', 'revenues', token=self.manager_token)
        if success and isinstance(response, list):
            self.log_test("Manager Get Revenues", True)
        else:
            self.log_test("Manager Get Revenues", False, f"Status: {status}, Response: {response}")

        # Test get revenues (admin - should see all entries)
        success, response, status = self.make_request('GET', 'revenues', token=self.admin_token)
        if success and isinstance(response, list):
            self.log_test("Admin Get All Revenues", True)
        else:
            self.log_test("Admin Get All Revenues", False, f"Status: {status}, Response: {response}")

        return True

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n🔍 Testing Dashboard Statistics...")
        
        # Test dashboard stats for manager
        success, response, status = self.make_request('GET', 'dashboard/stats', token=self.manager_token)
        if success and 'total_revenue' in response and 'total_entries' in response:
            self.log_test("Manager Dashboard Stats", True)
        else:
            self.log_test("Manager Dashboard Stats", False, f"Status: {status}, Response: {response}")

        # Test dashboard stats for admin
        success, response, status = self.make_request('GET', 'dashboard/stats', token=self.admin_token)
        if success and 'total_revenue' in response and 'total_entries' in response:
            self.log_test("Admin Dashboard Stats", True)
        else:
            self.log_test("Admin Dashboard Stats", False, f"Status: {status}, Response: {response}")

    def test_filtering_functionality(self):
        """Test filtering functionality for revenues"""
        print("\n🔍 Testing Filtering Functionality...")
        
        if not self.test_restaurant_id:
            return

        # Test filter by restaurant
        success, response, status = self.make_request('GET', f'revenues?restaurant_id={self.test_restaurant_id}', token=self.admin_token)
        if success:
            self.log_test("Filter Revenues by Restaurant", True)
        else:
            self.log_test("Filter Revenues by Restaurant", False, f"Status: {status}, Response: {response}")

        # Test filter by date
        today = datetime.now().strftime('%Y-%m-%d')
        success, response, status = self.make_request('GET', f'revenues?start_date={today}&end_date={today}', token=self.admin_token)
        if success:
            self.log_test("Filter Revenues by Date", True)
        else:
            self.log_test("Filter Revenues by Date", False, f"Status: {status}, Response: {response}")

    def test_unauthorized_access(self):
        """Test unauthorized access scenarios"""
        print("\n🔍 Testing Unauthorized Access...")
        
        # Test without token
        success, response, status = self.make_request('GET', 'auth/me', expected_status=401)
        if status == 401:
            self.log_test("Unauthorized Access (No Token)", True)
        else:
            self.log_test("Unauthorized Access (No Token)", False, f"Expected 401, got {status}")

        # Test with invalid token
        success, response, status = self.make_request('GET', 'auth/me', token="invalid_token", expected_status=401)
        if status == 401:
            self.log_test("Unauthorized Access (Invalid Token)", True)
        else:
            self.log_test("Unauthorized Access (Invalid Token)", False, f"Expected 401, got {status}")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Clean up revenue categories first
        if self.test_category_id and self.admin_token:
            success, response, status = self.make_request('DELETE', f'revenue-categories/{self.test_category_id}', token=self.admin_token)
            if success:
                self.log_test("Cleanup Test Category 1", True)
            else:
                self.log_test("Cleanup Test Category 1", False, f"Status: {status}")
        
        if self.test_category_id_2 and self.admin_token:
            success, response, status = self.make_request('DELETE', f'revenue-categories/{self.test_category_id_2}', token=self.admin_token)
            if success:
                self.log_test("Cleanup Test Category 2", True)
            else:
                self.log_test("Cleanup Test Category 2", False, f"Status: {status}")
        
        # Clean up restaurants
        if self.test_restaurant_id and self.admin_token:
            success, response, status = self.make_request('DELETE', f'restaurants/{self.test_restaurant_id}', token=self.admin_token)
            if success:
                self.log_test("Cleanup Test Restaurant 1", True)
            else:
                self.log_test("Cleanup Test Restaurant 1", False, f"Status: {status}")
        
        if self.test_restaurant_id_2 and self.admin_token:
            success, response, status = self.make_request('DELETE', f'restaurants/{self.test_restaurant_id_2}', token=self.admin_token)
            if success:
                self.log_test("Cleanup Test Restaurant 2", True)
            else:
                self.log_test("Cleanup Test Restaurant 2", False, f"Status: {status}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Food Court API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test authentication first
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False

        self.test_user_login()
        self.test_auth_me()
        
        # Test restaurant operations
        if self.test_restaurant_crud_admin():
            self.test_restaurant_access_manager()
        
        # Test revenue category restaurant association
        self.test_revenue_category_restaurant_association()
        
        # Test revenue operations
        self.test_revenue_operations()
        
        # Test dashboard and filtering
        self.test_dashboard_stats()
        self.test_filtering_functionality()
        
        # Test security
        self.test_unauthorized_access()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return len(self.failed_tests) == 0

def main():
    tester = FoodCourtAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())